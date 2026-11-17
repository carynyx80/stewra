// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {StewraEscrow} from "../src/StewraEscrow.sol";
import {TestUSD} from "../src/TestUSD.sol";

/// Drives random sequences of escrow actions.
contract EscrowHandler is Test {
    StewraEscrow public escrow;
    TestUSD public usd;
    address public arbiter;
    address[3] public actors;
    bytes32[] public ids;
    uint256 public nonce;

    constructor(StewraEscrow e, TestUSD u, address arb) {
        escrow = e;
        usd = u;
        arbiter = arb;
        actors = [makeAddr("a"), makeAddr("b"), makeAddr("c")];
        for (uint256 i; i < 3; i++) {
            vm.prank(actors[i]);
            usd.faucet();
            vm.prank(actors[i]);
            usd.approve(address(escrow), type(uint256).max);
        }
    }

    function fund(uint8 b, uint8 s, uint96 amount, uint16 feeBps) external {
        address buyer = actors[b % 3];
        address seller = actors[(s % 2 + 1 + b) % 3];
        amount = uint96(bound(amount, 1, usd.balanceOf(buyer) / 2 + 1));
        uint256 fee = (uint256(amount) * bound(feeBps, 0, 1000)) / 10_000;
        if (usd.balanceOf(buyer) < amount + fee) return;
        bytes32 id = keccak256(abi.encode(nonce++));
        vm.prank(buyer);
        escrow.fund(id, seller, address(usd), amount, fee, uint64(block.timestamp + 1 days));
        ids.push(id);
    }

    function _order(uint256 i) internal view returns (bytes32 id, address buyer, address seller) {
        id = ids[i % ids.length];
        (buyer, seller,,,,,,,) = escrow.orders(id);
    }

    function accept(uint256 i) external {
        if (ids.length == 0) return;
        (bytes32 id, address buyer,) = _order(i);
        vm.prank(buyer);
        try escrow.accept(id) {} catch {}
    }

    function deliver(uint256 i) external {
        if (ids.length == 0) return;
        (bytes32 id,, address seller) = _order(i);
        vm.prank(seller);
        try escrow.submitDelivery(id, keccak256("x")) {} catch {}
    }

    function dispute(uint256 i) external {
        if (ids.length == 0) return;
        (bytes32 id, address buyer,) = _order(i);
        vm.prank(buyer);
        try escrow.openDispute(id) {} catch {}
    }

    function resolve(uint256 i, uint16 bps) external {
        if (ids.length == 0) return;
        (bytes32 id,,) = _order(i);
        vm.prank(arbiter);
        try escrow.resolveDispute(id, uint16(bound(bps, 0, 10_000))) {} catch {}
    }

    function refund(uint256 i) external {
        if (ids.length == 0) return;
        (bytes32 id, address buyer,) = _order(i);
        vm.warp(block.timestamp + 2 days);
        vm.prank(buyer);
        try escrow.refundAfterDeadline(id) {} catch {}
    }

    function totalSupplyAccountedFor(address feeTo) external view returns (uint256 total) {
        for (uint256 i; i < 3; i++) total += usd.balanceOf(actors[i]);
        total += usd.balanceOf(address(escrow)) + usd.balanceOf(feeTo);
    }
}

contract StewraEscrowInvariantTest is Test {
    StewraEscrow escrow;
    TestUSD usd;
    EscrowHandler handler;
    address feeTo = makeAddr("feeTo");

    function setUp() public {
        usd = new TestUSD();
        address arbiter = makeAddr("arbiter");
        escrow = new StewraEscrow(address(this), arbiter, feeTo);
        escrow.setTokenAllowed(address(usd), true);
        handler = new EscrowHandler(escrow, usd, arbiter);
        targetContract(address(handler));
    }

    /// The escrow always holds exactly what it owes to open orders.
    function invariant_HeldEqualsBalance() public view {
        assertEq(escrow.totalHeld(address(usd)), usd.balanceOf(address(escrow)));
    }

    /// No tokens are created or lost: everything sits with participants, the escrow or the fee recipient.
    function invariant_Conservation() public view {
        assertEq(handler.totalSupplyAccountedFor(feeTo), usd.totalSupply());
    }
}
