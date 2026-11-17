// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {StewraEscrow} from "../src/StewraEscrow.sol";
import {TestUSD} from "../src/TestUSD.sol";

contract StewraEscrowTest is Test {
    StewraEscrow escrow;
    TestUSD usd;
    address owner = makeAddr("owner");
    address arbiter = makeAddr("arbiter");
    address feeTo = makeAddr("feeTo");
    address buyer = makeAddr("buyer");
    address seller = makeAddr("seller");
    bytes32 constant ID = keccak256("order-1");

    function setUp() public {
        usd = new TestUSD();
        escrow = new StewraEscrow(owner, arbiter, feeTo);
        vm.prank(owner);
        escrow.setTokenAllowed(address(usd), true);
        vm.prank(buyer);
        usd.faucet();
        vm.prank(buyer);
        usd.approve(address(escrow), type(uint256).max);
    }

    function _fund(uint256 amount, uint256 fee) internal {
        vm.prank(buyer);
        escrow.fund(ID, seller, address(usd), amount, fee, uint64(block.timestamp + 1 days));
    }

    function test_FundAcceptReleasesToSellerAndFee() public {
        _fund(100e6, 2e6);
        assertEq(usd.balanceOf(address(escrow)), 102e6);
        vm.prank(buyer);
        escrow.accept(ID);
        assertEq(usd.balanceOf(seller), 100e6);
        assertEq(usd.balanceOf(feeTo), 2e6);
        assertEq(usd.balanceOf(address(escrow)), 0);
        assertEq(escrow.totalHeld(address(usd)), 0);
    }

    function test_EmitsOrderFundedWithExactFields() public {
        vm.expectEmit(true, true, true, true, address(escrow));
        emit StewraEscrow.OrderFunded(ID, buyer, seller, address(usd), 100e6, 0, uint64(block.timestamp + 1 days));
        _fund(100e6, 0);
    }

    function test_RevertWhen_OrderIdReused() public {
        _fund(10e6, 0);
        vm.prank(buyer);
        vm.expectRevert(StewraEscrow.OrderExists.selector);
        escrow.fund(ID, seller, address(usd), 10e6, 0, uint64(block.timestamp + 1 days));
    }

    function test_RevertWhen_TokenNotAllowed() public {
        TestUSD other = new TestUSD();
        vm.prank(buyer);
        vm.expectRevert(StewraEscrow.TokenNotAllowed.selector);
        escrow.fund(ID, seller, address(other), 1, 0, uint64(block.timestamp + 1));
    }

    function test_RevertWhen_FeeAboveCap() public {
        vm.prank(buyer);
        vm.expectRevert(StewraEscrow.FeeTooHigh.selector);
        escrow.fund(ID, seller, address(usd), 100e6, 11e6, uint64(block.timestamp + 1 days));
    }

    function test_RevertWhen_SelfDealing() public {
        vm.prank(buyer);
        vm.expectRevert(StewraEscrow.InvalidOrder.selector);
        escrow.fund(ID, buyer, address(usd), 1e6, 0, uint64(block.timestamp + 1 days));
    }

    function test_OnlyBuyerCanAccept() public {
        _fund(10e6, 0);
        vm.prank(seller);
        vm.expectRevert(StewraEscrow.NotBuyer.selector);
        escrow.accept(ID);
    }

    function test_RefundAfterDeadlineWhenUndelivered() public {
        _fund(10e6, 1e6);
        vm.prank(buyer);
        vm.expectRevert(StewraEscrow.TooEarly.selector);
        escrow.refundAfterDeadline(ID);
        vm.warp(block.timestamp + 1 days + 1);
        uint256 before = usd.balanceOf(buyer);
        vm.prank(buyer);
        escrow.refundAfterDeadline(ID);
        assertEq(usd.balanceOf(buyer) - before, 11e6);
    }

    function test_NoRefundOnceDelivered() public {
        _fund(10e6, 0);
        vm.prank(seller);
        escrow.submitDelivery(ID, keccak256("work"));
        vm.warp(block.timestamp + 2 days);
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(StewraEscrow.WrongStatus.selector, StewraEscrow.Status.Delivered));
        escrow.refundAfterDeadline(ID);
    }

    function test_SellerClaimsAfterReviewWindow() public {
        _fund(10e6, 0);
        vm.prank(seller);
        escrow.submitDelivery(ID, keccak256("work"));
        vm.prank(seller);
        vm.expectRevert(StewraEscrow.TooEarly.selector);
        escrow.claimAfterReview(ID);
        vm.warp(block.timestamp + 3 days);
        vm.prank(seller);
        escrow.claimAfterReview(ID);
        assertEq(usd.balanceOf(seller), 10e6);
    }

    function test_DisputeBlocksReleaseAndArbiterSplits() public {
        _fund(100e6, 2e6);
        vm.prank(buyer);
        escrow.openDispute(ID);
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(StewraEscrow.WrongStatus.selector, StewraEscrow.Status.Disputed));
        escrow.accept(ID);
        vm.prank(owner);
        vm.expectRevert(StewraEscrow.NotArbiter.selector);
        escrow.resolveDispute(ID, 5000);
        uint256 buyerBefore = usd.balanceOf(buyer);
        vm.prank(arbiter);
        escrow.resolveDispute(ID, 6000);
        assertEq(usd.balanceOf(seller), 60e6);
        assertEq(usd.balanceOf(buyer) - buyerBefore, 42e6);
        assertEq(usd.balanceOf(address(escrow)), 0);
    }

    function test_PauseStopsNewOrdersButNotSettlement() public {
        _fund(10e6, 0);
        vm.prank(owner);
        escrow.pause();
        vm.prank(buyer);
        vm.expectRevert();
        escrow.fund(keccak256("o2"), seller, address(usd), 1e6, 0, uint64(block.timestamp + 1 days));
        vm.prank(buyer);
        escrow.accept(ID);
        assertEq(usd.balanceOf(seller), 10e6);
    }

    function testFuzz_ReleaseConservesFunds(uint96 amount, uint16 feeBps) public {
        amount = uint96(bound(amount, 1, 900e6));
        feeBps = uint16(bound(feeBps, 0, 1000));
        uint256 fee = (uint256(amount) * feeBps) / 10_000;
        uint256 start = usd.balanceOf(buyer);
        _fund(amount, fee);
        vm.prank(buyer);
        escrow.accept(ID);
        assertEq(usd.balanceOf(seller) + usd.balanceOf(feeTo) + usd.balanceOf(buyer), start);
        assertEq(usd.balanceOf(address(escrow)), 0);
    }

    function testFuzz_DisputeSplitConservesFunds(uint96 amount, uint16 sellerBps) public {
        amount = uint96(bound(amount, 1, 900e6));
        sellerBps = uint16(bound(sellerBps, 0, 10_000));
        uint256 start = usd.balanceOf(buyer);
        _fund(amount, 0);
        vm.prank(seller);
        escrow.openDispute(ID);
        vm.prank(arbiter);
        escrow.resolveDispute(ID, sellerBps);
        assertEq(usd.balanceOf(seller) + usd.balanceOf(buyer), start);
    }
}
