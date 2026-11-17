// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title StewraEscrow — escrow-backed service orders between buyers and AI businesses.
/// @notice The buyer funds `amount + fee`. The seller receives `amount` and the fee
///         recipient receives `fee` only when the buyer accepts, or when the seller
///         delivered and the review window passed without a dispute. If nothing is
///         delivered by the deadline the buyer can take a full refund. Disputes are
///         resolved by the arbiter with an explicit split. Funds can never go anywhere
///         except the buyer, the seller and the fee recipient.
contract StewraEscrow is ReentrancyGuard, Ownable2Step, Pausable {
    using SafeERC20 for IERC20;

    enum Status {
        None,
        Funded,
        Delivered,
        Released,
        Refunded,
        Disputed,
        Resolved
    }

    struct Order {
        address buyer;
        address seller;
        address token;
        uint256 amount;
        uint256 fee;
        uint64 deadline;
        uint64 deliveredAt;
        Status status;
        bytes32 deliverableHash;
    }

    uint64 public constant REVIEW_WINDOW = 3 days;
    uint16 public constant MAX_FEE_BPS = 1000;

    address public arbiter;
    address public feeRecipient;
    mapping(address => bool) public allowedTokens;
    mapping(bytes32 => Order) public orders;
    /// @dev total funds held per token, for invariant checking and transparency
    mapping(address => uint256) public totalHeld;

    event OrderFunded(
        bytes32 indexed orderId, address indexed buyer, address indexed seller, address token, uint256 amount, uint256 fee, uint64 deadline
    );
    event DeliverySubmitted(bytes32 indexed orderId, bytes32 deliverableHash);
    event PaymentReleased(bytes32 indexed orderId, address indexed seller, address token, uint256 amount, uint256 fee);
    event Refunded(bytes32 indexed orderId, address indexed buyer, uint256 amount);
    event DisputeOpened(bytes32 indexed orderId, address indexed by);
    event DisputeResolved(bytes32 indexed orderId, uint256 toSeller, uint256 toBuyer);
    event TokenAllowed(address indexed token, bool allowed);
    event ArbiterChanged(address indexed arbiter);
    event FeeRecipientChanged(address indexed feeRecipient);

    error OrderExists();
    error InvalidOrder();
    error TokenNotAllowed();
    error FeeTooHigh();
    error BadDeadline();
    error WrongStatus(Status status);
    error NotBuyer();
    error NotSeller();
    error NotParty();
    error NotArbiter();
    error TooEarly();
    error ZeroAddress();

    constructor(address owner_, address arbiter_, address feeRecipient_) Ownable(owner_) {
        if (arbiter_ == address(0) || feeRecipient_ == address(0)) revert ZeroAddress();
        arbiter = arbiter_;
        feeRecipient = feeRecipient_;
    }

    /* ------------------------------------------------------------------ admin */

    function setTokenAllowed(address token, bool allowed) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        allowedTokens[token] = allowed;
        emit TokenAllowed(token, allowed);
    }

    function setArbiter(address arbiter_) external onlyOwner {
        if (arbiter_ == address(0)) revert ZeroAddress();
        arbiter = arbiter_;
        emit ArbiterChanged(arbiter_);
    }

    function setFeeRecipient(address feeRecipient_) external onlyOwner {
        if (feeRecipient_ == address(0)) revert ZeroAddress();
        feeRecipient = feeRecipient_;
        emit FeeRecipientChanged(feeRecipient_);
    }

    /// @notice Emergency stop for new orders. Settlement of existing orders keeps working.
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /* ----------------------------------------------------------------- orders */

    /// @param orderId unique id chosen offchain; reusing an id reverts (replay protection)
    function fund(bytes32 orderId, address seller, address token, uint256 amount, uint256 fee, uint64 deadline)
        external
        nonReentrant
        whenNotPaused
    {
        if (orders[orderId].status != Status.None) revert OrderExists();
        if (seller == address(0) || seller == msg.sender || amount == 0) revert InvalidOrder();
        if (!allowedTokens[token]) revert TokenNotAllowed();
        if (fee * 10_000 > amount * MAX_FEE_BPS) revert FeeTooHigh();
        if (deadline <= block.timestamp) revert BadDeadline();

        orders[orderId] = Order({
            buyer: msg.sender,
            seller: seller,
            token: token,
            amount: amount,
            fee: fee,
            deadline: deadline,
            deliveredAt: 0,
            status: Status.Funded,
            deliverableHash: bytes32(0)
        });

        // effects before interaction; balance delta check rejects fee-on-transfer tokens
        uint256 total = amount + fee;
        uint256 before = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), total);
        if (IERC20(token).balanceOf(address(this)) - before != total) revert TokenNotAllowed();
        totalHeld[token] += total;

        emit OrderFunded(orderId, msg.sender, seller, token, amount, fee, deadline);
    }

    function submitDelivery(bytes32 orderId, bytes32 deliverableHash) external {
        Order storage o = orders[orderId];
        if (msg.sender != o.seller) revert NotSeller();
        if (o.status != Status.Funded) revert WrongStatus(o.status);
        o.status = Status.Delivered;
        o.deliveredAt = uint64(block.timestamp);
        o.deliverableHash = deliverableHash;
        emit DeliverySubmitted(orderId, deliverableHash);
    }

    /// @notice Buyer accepts the work and releases payment.
    function accept(bytes32 orderId) external nonReentrant {
        Order storage o = orders[orderId];
        if (msg.sender != o.buyer) revert NotBuyer();
        if (o.status != Status.Funded && o.status != Status.Delivered) revert WrongStatus(o.status);
        _release(orderId, o);
    }

    /// @notice Seller claims payment after delivering when the buyer stays silent past the review window.
    function claimAfterReview(bytes32 orderId) external nonReentrant {
        Order storage o = orders[orderId];
        if (msg.sender != o.seller) revert NotSeller();
        if (o.status != Status.Delivered) revert WrongStatus(o.status);
        if (block.timestamp < o.deliveredAt + REVIEW_WINDOW) revert TooEarly();
        _release(orderId, o);
    }

    /// @notice Buyer reclaims everything when nothing was delivered by the deadline.
    function refundAfterDeadline(bytes32 orderId) external nonReentrant {
        Order storage o = orders[orderId];
        if (msg.sender != o.buyer) revert NotBuyer();
        if (o.status != Status.Funded) revert WrongStatus(o.status);
        if (block.timestamp <= o.deadline) revert TooEarly();
        o.status = Status.Refunded;
        uint256 total = o.amount + o.fee;
        totalHeld[o.token] -= total;
        IERC20(o.token).safeTransfer(o.buyer, total);
        emit Refunded(orderId, o.buyer, total);
    }

    function openDispute(bytes32 orderId) external {
        Order storage o = orders[orderId];
        if (msg.sender != o.buyer && msg.sender != o.seller) revert NotParty();
        if (o.status != Status.Funded && o.status != Status.Delivered) revert WrongStatus(o.status);
        o.status = Status.Disputed;
        emit DisputeOpened(orderId, msg.sender);
    }

    /// @notice Arbiter splits the service amount; the fee is refunded to the buyer on any dispute.
    /// @param sellerBps share of `amount` (0..10000) paid to the seller
    function resolveDispute(bytes32 orderId, uint16 sellerBps) external nonReentrant {
        if (msg.sender != arbiter) revert NotArbiter();
        Order storage o = orders[orderId];
        if (o.status != Status.Disputed) revert WrongStatus(o.status);
        if (sellerBps > 10_000) revert InvalidOrder();
        o.status = Status.Resolved;
        uint256 toSeller = (o.amount * sellerBps) / 10_000;
        uint256 toBuyer = o.amount - toSeller + o.fee;
        totalHeld[o.token] -= o.amount + o.fee;
        if (toSeller > 0) IERC20(o.token).safeTransfer(o.seller, toSeller);
        if (toBuyer > 0) IERC20(o.token).safeTransfer(o.buyer, toBuyer);
        emit DisputeResolved(orderId, toSeller, toBuyer);
    }

    function _release(bytes32 orderId, Order storage o) private {
        o.status = Status.Released;
        totalHeld[o.token] -= o.amount + o.fee;
        IERC20(o.token).safeTransfer(o.seller, o.amount);
        if (o.fee > 0) IERC20(o.token).safeTransfer(feeRecipient, o.fee);
        emit PaymentReleased(orderId, o.seller, o.token, o.amount, o.fee);
    }
}
