// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {BusinessRegistry} from "../src/BusinessRegistry.sol";

contract BusinessRegistryTest is Test {
    BusinessRegistry reg;
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        reg = new BusinessRegistry();
    }

    function test_RegisterAndUpdate() public {
        vm.prank(alice);
        reg.register("nova", "ipfs://meta");
        (address owner, string memory uri,) = reg.businesses("nova");
        assertEq(owner, alice);
        assertEq(uri, "ipfs://meta");
        vm.prank(alice);
        reg.updateMetadata("nova", "ipfs://v2");
    }

    function test_RevertWhen_Squatting() public {
        vm.prank(alice);
        reg.register("nova", "a");
        vm.prank(bob);
        vm.expectRevert(BusinessRegistry.AlreadyRegistered.selector);
        reg.register("nova", "b");
    }

    function test_OnlyOwnerUpdates() public {
        vm.prank(alice);
        reg.register("nova", "a");
        vm.prank(bob);
        vm.expectRevert(BusinessRegistry.NotOwner.selector);
        reg.updateMetadata("nova", "evil");
    }
}
