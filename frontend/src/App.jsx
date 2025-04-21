import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { parseEther, formatEther } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import contractABI from "./lib/MembershipNFT.json";
import NFTDisplay from "./components/NFTDisplay";

const CONTRACT_ADDRESS = "0x5ba800BCCEb770fC8Bb7c2c1dC3C72535F0Aa847";

function App() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [activeTab, setActiveTab] = useState("join");
  const [parties, setParties] = useState([]);
  const [partyCount, setPartyCount] = useState(0);
  const [newPartyName, setNewPartyName] = useState("");
  const [newPartyFee, setNewPartyFee] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const { writeContractAsync, data: writeData } = useWriteContract();

  const { data: ownerData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: contractABI,
    functionName: "owner",
  });

  const { data: partyCountData, refetch: refetchPartyCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: contractABI,
    functionName: "partyCount",
  });

  const { isLoading: isWaitingForTransaction, isSuccess: transactionSuccess } =
    useWaitForTransactionReceipt({
      hash: writeData,
    });

  useEffect(() => {
    if (isConnected && ownerData && address) {
      setIsOwner(ownerData.toLowerCase() === address.toLowerCase());
    }
  }, [ownerData, address, isConnected]);

  useEffect(() => {
    if (partyCountData !== undefined) {
      setPartyCount(Number(partyCountData));
    }
  }, [partyCountData]);

  useEffect(() => {
    if (transactionSuccess) {
      setLoading(false);
      refetchPartyCount();

      setRefreshCounter((prev) => prev + 1);

      setNewPartyName("");
      setNewPartyFee("");
    }
  }, [transactionSuccess]);

  useEffect(() => {
    const fetchParties = async () => {
      if (isConnected) {
        setLoading(true);
        // console.log("loading:", loading)

        try {
          console.log("Fetching data for", partyCount, "parties");

          const partyResults = await Promise.all(
            Array.from({ length: partyCount }, (_, i) =>
              publicClient
                .readContract({
                  address: CONTRACT_ADDRESS,
                  abi: contractABI,
                  functionName: "parties",
                  args: [i],
                })
                .then((result) => ({ status: "success", result }))
                .catch((error) => ({ status: "error", error }))
            )
          );

          const memberships = Array(partyCount)
            .fill()
            .map(() => ({
              isMember: false,
              tokenId: null,
            }));

          let tokenPartyIndices = [];

          if (address) {
            const membershipResults = await Promise.all(
              Array.from({ length: partyCount }, (_, i) =>
                publicClient
                  .readContract({
                    address: CONTRACT_ADDRESS,
                    abi: contractABI,
                    functionName: "isMember",
                    args: [i, address],
                  })
                  .then((result) => ({ status: "success", result }))
                  .catch((error) => ({ status: "error", error }))
              )
            );

            console.log("Membership results:", membershipResults);

            const tokenCalls = [];

            for (let i = 0; i < partyCount; i++) {
              if (
                membershipResults[i].status === "success" &&
                membershipResults[i].result === true
              ) {
                memberships[i].isMember = true;
                tokenPartyIndices.push(i);
                tokenCalls.push(
                  publicClient
                    .readContract({
                      address: CONTRACT_ADDRESS,
                      abi: contractABI,
                      functionName: "memberTokens",
                      args: [address, i],
                    })
                    .then((result) => ({ status: "success", result }))
                    .catch((error) => ({ status: "error", error }))
                );
              }
            }

            const tokenResults = await Promise.all(tokenCalls);

            for (let i = 0; i < tokenResults.length; i++) {
              if (tokenResults[i].status === "success") {
                const partyIndex = tokenPartyIndices[i];
                memberships[partyIndex].tokenId = tokenResults[i].result;
              }
            }
          }

          const processedParties = [];
          for (let i = 0; i < partyCount; i++) {
            if (partyResults[i].status === "success") {
              const partyData = partyResults[i].result;

              processedParties.push({
                id: i,
                name: partyData[0],
                joinFee: partyData[1],
                memberCount: Number(partyData[2]),
                totalContributions: partyData[3],
                isMember: memberships[i].isMember,
                tokenId: memberships[i].tokenId,
              });
            } else {
              console.error(
                `Error fetching party ${i}:`,
                partyResults[i].error
              );
            }
          }

          console.log("Processed parties:", processedParties);
          setParties(processedParties);
        } catch (error) {
          console.error("Error fetching parties:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchParties();
  }, [partyCount, isConnected, address, publicClient, refreshCounter]);

  const handleCreateParty = async () => {
    if (!newPartyName || !newPartyFee) {
      alert("Please enter both name and fee");
      return;
    }

    try {
      setLoading(true);
      const feeInWei = parseEther(newPartyFee);
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: contractABI,
        functionName: "createParty",
        args: [newPartyName, feeInWei],
      });
    } catch (error) {
      console.error("Error creating party:", error);
      alert("Error creating party. Please check console for details.");
      setLoading(false);
    }
  };

  const handleJoinParty = async (partyId, fee) => {
    try {
      setLoading(true);
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: contractABI,
        functionName: "payContributionToJoinParty",
        args: [partyId],
        value: fee,
      });
    } catch (error) {
      console.error("Error joining party:", error);
      alert("Error joining party. Please check console for details.");
      setLoading(false);
    }
  };

  const handleWithdraw = async (partyId) => {
    try {
      setLoading(true);
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: contractABI,
        functionName: "withdrawContributions",
        args: [partyId, address],
      });
    } catch (error) {
      console.error("Error withdrawing contributions:", error);
      alert(
        "Error withdrawing contributions. Please check console for details."
      );
      setLoading(false);
    }
  };

  // Render functions
  const renderJoinTab = () => (
    <div className="bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Join a Party</h2>
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1abc9c]">
          </div>
        </div>
      ) : parties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {parties.map((party) => (
            <div
              key={party.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-xl font-semibold text-white mb-2">
                {party.name}
              </h3>
              <p className="text-gray-600 mb-1">
                Join Fee:{" "}
                <span className="font-medium">
                  {formatEther(party.joinFee)} ETH
                </span>
              </p>
              <p className="text-gray-600 mb-1">
                Members:{" "}
                <span className="font-medium">{party.memberCount}</span>
              </p>
              <p className="text-gray-600 mb-3">
                Status:{" "}
                <span
                  className={
                    party.isMember ? "text-green-500" : "text-amber-500"
                  }
                >
                  {party.isMember ? "Member" : "Not a Member"}
                </span>
              </p>
              {!party.isMember && (
                <button
                  onClick={() => handleJoinParty(party.id, party.joinFee)}
                  disabled={loading || isWaitingForTransaction}
                  className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                    loading || isWaitingForTransaction
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-[#1abc9c] hover:bg-[#5ce8c1] text-gray-800"
                  }`}
                >
                  {loading || isWaitingForTransaction
                    ? "Processing..."
                    : `Join for ${formatEther(party.joinFee)} ETH`}
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-700 rounded-lg">
          <p className="text-white">No parties available to join</p>
        </div>
      )}
    </div>
  );

  console.log("all parties:", parties);

  const renderMyMembershipsTab = () => (
    <div className="bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-white mb-4">My Memberships</h2>
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1abc9c]"></div>
        </div>
      ) : parties.filter((party) => party.isMember).length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {parties
            .filter((party) => party.isMember)
            .map((party) => (
              <div
                key={party.id}
                className="border border-gray-200 space-y-3 rounded-lg p-4 hover:shadow-lg transition-shadow"
              >
                <h3 className="text-xl font-semibold text-gray-200 mb-2">
                  {party.name}
                </h3>
                <p className="text-gray-500 mb-1">
                  Token ID:{" "}
                  <span className="font-medium">
                    {party.tokenId !== null && party.tokenId !== undefined
                      ? Number(party.tokenId)
                      : "Not available"}
                  </span>
                </p>

                {party.tokenId !== null && party.tokenId !== undefined ? (
                  <NFTDisplay
                    contractAddress={CONTRACT_ADDRESS}
                    tokenId={party.tokenId}
                  />
                ) : (
                  <div className="bg-gray-100 rounded-lg p-4 mb-3">
                    <div className="text-center">
                      <div className="text-gray-500">Membership NFT</div>
                      <div className="font-medium text-gray-700">
                        {party.name}
                      </div>
                    </div>
                  </div>
                )}
{/* 
                <button
                  onClick={() => {
                    if (party.tokenId !== null && party.tokenId !== undefined) {
                      window.open(
                        `https://testnets.opensea.io/assets/sepolia/${CONTRACT_ADDRESS}/${party.tokenId}`
                      );
                    } else {
                      alert("Token ID not available");
                    }
                  }}
                  disabled={
                    party.tokenId === null || party.tokenId === undefined
                  }
                  className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                    party.tokenId === null || party.tokenId === undefined
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-[#1abc9c] hover:bg-[#5ce8c1] text-gray-800"
                  }`}
                >
                  View on OpenSea
                </button> */}
              </div>
            ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-700 rounded-lg">
          <p className="text-white">You are not a member of any parties</p>
        </div>
      )}
    </div>
  );

  const renderAdminTab = () => (
    <div className="bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Admin Panel</h2>

      <div className="mb-8 p-4 border border-gray-200 rounded-lg">
        <h3 className="text-xl font-semibold text-white mb-4">
          Create New Party
        </h3>
        <div className="mb-4">
          <label className="block text-gray-400 mb-2">Name:</label>
          <input
            type="text"
            value={newPartyName}
            onChange={(e) => setNewPartyName(e.target.value)}
            placeholder="Party Name"
            className="w-full p-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1abc9c]"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-400 mb-2">Join Fee (ETH):</label>
          <input
            type="text"
            value={newPartyFee}
            onChange={(e) => setNewPartyFee(e.target.value)}
            placeholder="0.01"
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1abc9c]"
          />
        </div>
        <button
          onClick={handleCreateParty}
          disabled={
            loading || isWaitingForTransaction || !newPartyName || !newPartyFee
          }
          className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
            loading || isWaitingForTransaction || !newPartyName || !newPartyFee
              ? "bg-[#1abc9c] cursor-not-allowed"
              : "bg-[#1abc9c] hover:bg-[#5ce8c1] text-gray-800"
          }`}
        >
          {loading || isWaitingForTransaction ? "Creating..." : "Create Party"}
        </button>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-gray-700 mb-4">
          Manage Parties
        </h3>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1abc9c]"></div>
          </div>
        ) : parties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {parties.map((party) => (
              <div
                key={party.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow"
              >
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  {party.name}
                </h3>
                <p className="text-gray-600 mb-1">
                  Members:{" "}
                  <span className="font-medium">{party.memberCount}</span>
                </p>
                <p className="text-gray-600 mb-3">
                  Total Contributions:{" "}
                  <span className="font-medium">
                    {formatEther(party.totalContributions)} ETH
                  </span>
                </p>
                <button
                  onClick={() => handleWithdraw(party.id)}
                  disabled={
                    loading ||
                    isWaitingForTransaction ||
                    Number(party.totalContributions) === 0
                  }
                  className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                    loading ||
                    isWaitingForTransaction ||
                    Number(party.totalContributions) === 0
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-[#1abc9c] hover:bg-[#5ce8c1] text-gray-800"
                  }`}
                >
                  {loading || isWaitingForTransaction
                    ? "Processing..."
                    : `Withdraw ${formatEther(party.totalContributions)} ETH`}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-c rounded-lg">
            <p className="text-gray-500">No parties created yet</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 shadow-sm py-4 px-6 fixed w-full">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-4xl font-bold text-[#1abc9c]">PartyTea</h1>
          <ConnectButton />
        </div>
      </header>

      {isConnected ? (
        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 pt-[100px]">
          <nav className="flex space-x-2 mb-6 border-b border-gray-200">
            <button
              className={`py-2 px-4 font-medium rounded-t-lg ${
                activeTab === "join"
                  ? "bg-[#1abc9c] text-gray-800"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
              onClick={() => setActiveTab("join")}
            >
              Join Party
            </button>
            <button
              className={`py-2 px-4 font-medium rounded-t-lg ${
                activeTab === "memberships"
                  ? "bg-[#1abc9c] text-gray-800"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
              onClick={() => setActiveTab("memberships")}
            >
              My Memberships
            </button>
            {isOwner && (
              <button
                className={`py-2 px-4 font-medium rounded-t-lg ${
                  activeTab === "admin"
                    ? "bg-[#1abc9c] text-gray-800"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => setActiveTab("admin")}
              >
                Admin
              </button>
            )}
          </nav>

          {activeTab === "join" && renderJoinTab()}
          {activeTab === "memberships" && renderMyMembershipsTab()}
          {activeTab === "admin" && isOwner && renderAdminTab()}
        </main>
      ) : (
        <div className="max-w-7xl mx-auto py-20 px-4 sm:px-6 lg:px-8 text-center pt-[100px]">
          <div className="bg-gray-700 p-8 rounded-lg shadow-md max-w-md mx-auto items-center flex flex-col ">
            <h2 className="text-xl font-semibold text-white mb-4">
              Connect Your Wallet
            </h2>
            <p className="text-white mb-6">
              Please connect your wallet to use PartyTea
            </p>
            <ConnectButton />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
