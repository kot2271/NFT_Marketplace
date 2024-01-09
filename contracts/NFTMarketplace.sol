// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract NFTMarketplace is AccessControl, ReentrancyGuard {
    using Counters for Counters.Counter;
    Counters.Counter private _itemIds;

    // The role that can create NFTs
    bytes32 public constant ARTIST_ROLE = keccak256("ARTIST_ROLE");

    // The role that can list NFTs
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Store a reference to the ERC721 contract
    IERC721 public nftContract;

    // Store token listings
    struct Listing {
        uint256 tokenId;
        address owner;
        uint256 price;
        address paymentToken;
    }
    mapping(uint256 => Listing) public listings;

    // Event for NFT creation
    event ItemCreated(uint256 tokenId, address owner);

    // Event for token listing
    event ItemListed(uint256 tokenId, uint256 price, address paymentToken);

    // Event for token purchase
    event ItemPurchased(uint256 tokenId, address buyer, uint256 price);

    // Event for listing cancellation
    event ListingCancelled(uint256 tokenId);

    /**
     * @dev Constructor
     * @param _nftContract The address of the ERC721 contract
     */
    constructor(address _nftContract) {
        _grantRole(ADMIN_ROLE, msg.sender);
        nftContract = IERC721(_nftContract);
    }

    /**
     * @dev Grant the 'artist' role to a user
     * @param user The address of the user to grant the role to
     */
    function grantArtistRole(address user) external {
        require(
            hasRole(ADMIN_ROLE, msg.sender),
            "NFT_Marketplace: must have role ADMIN_ROLE to grant"
        );
        _grantRole(ARTIST_ROLE, user);
    }

    /**
     * @dev Create a new NFT
     */
    function createItem() external {
        require(
            hasRole(ARTIST_ROLE, msg.sender),
            "NFT_Marketplace: must have role ARTIST_ROLE to mint"
        );
        _itemIds.increment();
        uint256 tokenId = _itemIds.current();

        // Call to the NFT contract to mint a new token
        // and store the result in the `mintSuccess` variable
        (bool mintSuccess, ) = address(nftContract).call(
            abi.encodeWithSelector(
                bytes4(keccak256("mint(address,uint256)")),
                msg.sender,
                tokenId
            )
        );
        require(mintSuccess, "NFT_Marketplace: mint token failed");
        emit ItemCreated(tokenId, msg.sender);
    }

    /**
     * @dev List a token for sale
     * @param _tokenId The ID of the token to be listed
     * @param _price The price of the token
     * @param _tokenAddress The address of the payment token
     */
    function listItem(
        uint256 _tokenId,
        uint256 _price,
        address _tokenAddress
    ) external nonReentrant {
        require(
            nftContract.ownerOf(_tokenId) == msg.sender,
            "NFT_Marketplace: Only owner can list"
        );
        require(
            listings[_tokenId].owner == address(0),
            "NFT_Marketplace: Token already listed"
        );

        listings[_tokenId] = Listing({
            tokenId: _tokenId,
            owner: msg.sender,
            price: _price,
            paymentToken: _tokenAddress
        });

        emit ItemListed(_tokenId, _price, _tokenAddress);
    }

    /**
     * @dev Buy a listed token
     * @param _tokenId The ID of the token to be purchased
     */
    function buyItem(uint256 _tokenId) external payable nonReentrant {
        Listing memory listing = listings[_tokenId];

        require(
            listing.owner != address(0),
            "NFT_Marketplace: Token not listed"
        );

        if (listing.paymentToken == address(0)) {
            // The payment token is the native token (ETH)
            require(
                msg.value == listing.price,
                "NFT_Marketplace: Incorrect payment amount"
            );
            payable(listing.owner).transfer(msg.value);
        } else {
            // The payment token is an ERC20 token
            require(
                IERC20(listing.paymentToken).transferFrom(
                    msg.sender,
                    listing.owner,
                    listing.price
                ),
                "NFT_Marketplace: Payment token transfer failed"
            );
        }

        // Transfer NFT
        nftContract.safeTransferFrom(listing.owner, msg.sender, _tokenId);

        delete listings[_tokenId];

        emit ItemPurchased(_tokenId, msg.sender, listing.price);
    }

    /**
     * @dev Cancel a listing
     * @param _tokenId The ID of the token listing to be cancelled
     */
    function cancel(uint256 _tokenId) external nonReentrant {
        require(
            listings[_tokenId].owner == msg.sender,
            "NFT_Marketplace: Only owner can cancel"
        );

        delete listings[_tokenId];

        emit ListingCancelled(_tokenId);
    }
}
