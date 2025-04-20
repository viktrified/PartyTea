import { useState, useEffect } from "react";
import { useReadContract } from "wagmi";
import contractABI from "../lib/MembershipNFT.json";

const NFTDisplay = ({ contractAddress, tokenId }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const { data: tokenURIData } = useReadContract({
    address: contractAddress,
    abi: contractABI.abi,
    functionName: "tokenURI",
    args: [tokenId],
    enabled: tokenId !== null && tokenId !== undefined,
  });

  useEffect(() => {
    if (tokenURIData) {
      try {
        const base64Json = tokenURIData.split(",")[1];
        const jsonString = atob(base64Json);
        const metadata = JSON.parse(jsonString);

        setImageUrl(metadata.image);
        setIsLoading(false);
      } catch (err) {
        console.error("Error parsing token URI:", err);
        setError("Failed to parse NFT data");
        setIsLoading(false);
      }
    }
  }, [tokenURIData]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#74fad1]"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center p-4">{error}</div>;
  }

  if (!imageUrl) {
    return (
      <div className="text-gray-500 text-center p-4">
        NFT image not available
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="flex justify-center">
        <img
          src={imageUrl}
          alt="NFT"
          className="max-w-full h-auto rounded-lg"
          onError={() => setError("Failed to load NFT image")}
        />
      </div>
    </div>
  );
};

export default NFTDisplay;
