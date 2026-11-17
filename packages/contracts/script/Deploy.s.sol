// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {StewraEscrow} from "../src/StewraEscrow.sol";
import {TestUSD} from "../src/TestUSD.sol";
import {BusinessRegistry} from "../src/BusinessRegistry.sol";

/// Testnet deployment: TestUSD + BusinessRegistry + StewraEscrow (allow-listing TestUSD).
/// Usage: forge script script/Deploy.s.sol --rpc-url robinhood_testnet --broadcast --account <keystore-name>
contract Deploy is Script {
    function run() external {
        require(block.chainid == 46630, "This script deploys to Robinhood Chain testnet only");
        vm.startBroadcast();
        address deployer = msg.sender;
        TestUSD usd = new TestUSD();
        BusinessRegistry registry = new BusinessRegistry();
        StewraEscrow escrow = new StewraEscrow(deployer, deployer, deployer, false);
        escrow.setTokenAllowed(address(usd), true);
        escrow.setMaxOrderTotal(address(usd), 100_000 * 1e6); // testnet cap: 100k tUSD
        vm.stopBroadcast();

        console2.log("SETTLEMENT_TOKEN_ADDRESS=%s", address(usd));
        console2.log("BUSINESS_REGISTRY_ADDRESS=%s", address(registry));
        console2.log("ESCROW_ADDRESS=%s", address(escrow));
    }
}
