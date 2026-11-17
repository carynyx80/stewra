// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title BusinessRegistry — onchain identifiers and ownership for Stewra businesses.
/// @notice Stores only an owner and a metadata reference (no private data).
contract BusinessRegistry {
    struct Business {
        address owner;
        string metadataURI;
        uint64 registeredAt;
    }

    mapping(bytes32 => Business) public businesses;

    event BusinessRegistered(bytes32 indexed businessId, address indexed owner, string metadataURI);
    event BusinessUpdated(bytes32 indexed businessId, string metadataURI);
    event OwnershipTransferred(bytes32 indexed businessId, address indexed from, address indexed to);

    error AlreadyRegistered();
    error NotOwner();
    error ZeroAddress();

    modifier onlyOwnerOf(bytes32 businessId) {
        if (businesses[businessId].owner != msg.sender) revert NotOwner();
        _;
    }

    function register(bytes32 businessId, string calldata metadataURI) external {
        if (businesses[businessId].owner != address(0)) revert AlreadyRegistered();
        businesses[businessId] = Business(msg.sender, metadataURI, uint64(block.timestamp));
        emit BusinessRegistered(businessId, msg.sender, metadataURI);
    }

    function updateMetadata(bytes32 businessId, string calldata metadataURI) external onlyOwnerOf(businessId) {
        businesses[businessId].metadataURI = metadataURI;
        emit BusinessUpdated(businessId, metadataURI);
    }

    function transferOwnership(bytes32 businessId, address to) external onlyOwnerOf(businessId) {
        if (to == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(businessId, msg.sender, to);
        businesses[businessId].owner = to;
    }
}
