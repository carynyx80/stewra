// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {StewraEscrow} from "../src/StewraEscrow.sol";
import {BusinessRegistry} from "../src/BusinessRegistry.sol";

/// Guarded mainnet launch on Robinhood Chain (4663).
///
/// Required environment variables (no defaults, nothing hard-coded):
///   STEWRA_OWNER          multisig that will own the escrow (must accept ownership)
///   STEWRA_ARBITER        address that resolves disputes (ideally the same or another multisig)
///   STEWRA_FEE_RECIPIENT  where platform fees go
///   SETTLEMENT_TOKEN      verified stablecoin contract on Robinhood Chain
///   MAX_ORDER_TOTAL       per-order cap in token base units (e.g. 500000000 = 500 USDC at 6 decimals)
///
/// The escrow is deployed PAUSED. After the owner multisig calls acceptOwnership(),
/// it calls unpause() when you are ready to accept orders.
///
/// Usage:
///   forge script script/DeployMainnet.s.sol --rpc-url robinhood_mainnet --broadcast --account <keystore>
contract DeployMainnet is Script {
    function run() external {
        require(block.chainid == 4663, "Not Robinhood Chain mainnet (4663)");
        address owner = vm.envAddress("STEWRA_OWNER");
        address arbiter = vm.envAddress("STEWRA_ARBITER");
        address feeRecipient = vm.envAddress("STEWRA_FEE_RECIPIENT");
        address token = vm.envAddress("SETTLEMENT_TOKEN");
        uint256 maxOrderTotal = vm.envUint("MAX_ORDER_TOTAL");

        require(owner != address(0) && arbiter != address(0) && feeRecipient != address(0), "zero address");
        require(token.code.length > 0, "SETTLEMENT_TOKEN has no contract code on this chain");
        require(maxOrderTotal > 0, "MAX_ORDER_TOTAL must be > 0");
        if (owner.code.length == 0) console2.log("WARNING: STEWRA_OWNER is not a contract. A multisig is strongly recommended.");

        string memory symbol = IERC20Metadata(token).symbol();
        uint8 decimals = IERC20Metadata(token).decimals();

        vm.startBroadcast();
        address deployer = msg.sender;
        BusinessRegistry registry = new BusinessRegistry();
        StewraEscrow escrow = new StewraEscrow(deployer, arbiter, feeRecipient, true); // starts paused
        escrow.setTokenAllowed(token, true);
        escrow.setMaxOrderTotal(token, maxOrderTotal);
        if (owner != deployer) escrow.transferOwnership(owner); // two-step: owner must accept
        vm.stopBroadcast();

        console2.log("Settlement token: %s (%s, %s decimals)", token, symbol, decimals);
        console2.log("Per-order cap (base units): %s", maxOrderTotal);
        console2.log("ESCROW_ADDRESS=%s", address(escrow));
        console2.log("BUSINESS_REGISTRY_ADDRESS=%s", address(registry));
        console2.log("SETTLEMENT_TOKEN_ADDRESS=%s", token);
        console2.log("SETTLEMENT_TOKEN_SYMBOL=%s", symbol);
        console2.log("SETTLEMENT_TOKEN_DECIMALS=%s", decimals);
        console2.log("NEXT: owner multisig calls acceptOwnership(), then unpause() on the escrow.");
    }
}
