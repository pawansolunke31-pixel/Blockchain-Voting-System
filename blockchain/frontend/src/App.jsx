import { useEffect, useState } from "react";
import { ethers } from "ethers";

import {
  CONTRACT_ADDRESS,
  VOTING_ABI,
} from "./contract";

function App() {

  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);

  const [adminAddress, setAdminAddress] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [candidateName, setCandidateName] = useState("");
  const [candidates, setCandidates] = useState([]);

  const [electionState, setElectionState] = useState(0);
  const [totalVotes, setTotalVotes] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);

  const [status, setStatus] = useState(
    "Connect MetaMask to continue."
  );

  const [loading, setLoading] = useState(false);

  // --------------------------------
  // MetaMask listeners
  // --------------------------------

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountChange = () => {
      window.location.reload();
    };

    const handleNetworkChange = () => {
      window.location.reload();
    };

    window.ethereum.on(
      "accountsChanged",
      handleAccountChange
    );

    window.ethereum.on(
      "chainChanged",
      handleNetworkChange
    );

    return () => {
      window.ethereum.removeListener(
        "accountsChanged",
        handleAccountChange
      );

      window.ethereum.removeListener(
        "chainChanged",
        handleNetworkChange
      );
    };
  }, []);

  // --------------------------------
  // Error message helper
  // --------------------------------

  const getErrorMessage = (error) => {

    console.error(error);

    if (error?.reason) {
      return error.reason;
    }

    if (error?.shortMessage) {
      return error.shortMessage;
    }

    if (error?.info?.error?.message) {
      return error.info.error.message;
    }

    return "Transaction failed.";
  };

  // --------------------------------
  // Switch MetaMask to Hardhat
  // --------------------------------

  const switchToHardhat = async () => {

    if (!window.ethereum) {
      alert("Install MetaMask first.");
      return;
    }

    try {

      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [
          {
            chainId: "0x7A69",
          },
        ],
      });

    } catch (error) {

      // Network does not exist
      if (error.code === 4902) {

        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x7A69",

              chainName: "Hardhat Local",

              rpcUrls: [
                "http://127.0.0.1:8545",
              ],

              nativeCurrency: {
                name: "Ethereum",
                symbol: "ETH",
                decimals: 18,
              },
            },
          ],
        });

      } else {

        console.error(error);

      }
    }
  };

  // --------------------------------
  // Connect Wallet
  // --------------------------------

  const connectWallet = async () => {

    try {

      if (!window.ethereum) {

        setStatus(
          "MetaMask is not installed."
        );

        return;
      }

      setLoading(true);

      const accounts =
        await window.ethereum.request({
          method: "eth_requestAccounts",
        });

      const provider =
        new ethers.BrowserProvider(
          window.ethereum
        );

      const network =
        await provider.getNetwork();

      if (network.chainId !== 31337n) {

        setAccount(accounts[0]);

        setStatus(
          "Wrong network. Switch to Hardhat Local."
        );

        setLoading(false);

        return;
      }

      // Check deployed contract
      const code =
        await provider.getCode(
          CONTRACT_ADDRESS
        );

      if (code === "0x") {

        setStatus(
          "Voting contract not found. Deploy contract again."
        );

        setLoading(false);

        return;
      }

      const signer =
        await provider.getSigner();

      const votingContract =
        new ethers.Contract(
          CONTRACT_ADDRESS,
          VOTING_ABI,
          signer
        );

      setAccount(accounts[0]);

      setContract(votingContract);

      await loadBlockchainData(
        votingContract,
        accounts[0]
      );

      setStatus(
        "Wallet connected successfully."
      );

    } catch (error) {

      setStatus(
        getErrorMessage(error)
      );

    } finally {

      setLoading(false);

    }
  };

  // --------------------------------
  // Load blockchain information
  // --------------------------------

  const loadBlockchainData =
    async (
      votingContract = contract,
      currentAccount = account
    ) => {

      if (!votingContract) return;

      try {

        const admin =
          await votingContract.admin();

        const state =
          await votingContract.electionState();

        const count =
          await votingContract.candidateCount();

        const votes =
          await votingContract.totalVotes();

        const voted =
          currentAccount
            ? await votingContract.hasVoted(
                currentAccount
              )
            : false;

        const candidateArray = [];

        for (
          let i = 1;
          i <= Number(count);
          i++
        ) {

          const candidate =
            await votingContract.candidates(i);

          candidateArray.push({
            id: Number(candidate.id),
            name: candidate.name,
            voteCount:
              Number(candidate.voteCount),
          });

        }

        setAdminAddress(admin);

        setIsAdmin(
          currentAccount.toLowerCase() ===
            admin.toLowerCase()
        );

        setElectionState(
          Number(state)
        );

        setTotalVotes(
          Number(votes)
        );

        setHasVoted(voted);

        setCandidates(
          candidateArray
        );

      } catch (error) {

        console.error(error);

      }
    };

  // --------------------------------
  // Add Candidate
  // --------------------------------

  const addCandidate = async () => {

    if (!contract) {

      setStatus(
        "Connect wallet first."
      );

      return;
    }

    if (!candidateName.trim()) {

      setStatus(
        "Please enter candidate name."
      );

      return;
    }

    try {

      setLoading(true);

      setStatus(
        "Confirm Add Candidate transaction in MetaMask..."
      );

      const tx =
        await contract.addCandidate(
          candidateName.trim()
        );

      setStatus(
        "Adding candidate to blockchain..."
      );

      await tx.wait();

      setCandidateName("");

      await loadBlockchainData();

      setStatus(
        "Candidate added successfully."
      );

    } catch (error) {

      setStatus(
        getErrorMessage(error)
      );

    } finally {

      setLoading(false);

    }
  };

  // --------------------------------
  // Start Election
  // --------------------------------

  const startElection = async () => {

    try {

      setLoading(true);

      setStatus(
        "Confirm Start Election in MetaMask..."
      );

      const tx =
        await contract.startElection();

      await tx.wait();

      await loadBlockchainData();

      setStatus(
        "Election started successfully."
      );

    } catch (error) {

      setStatus(
        getErrorMessage(error)
      );

    } finally {

      setLoading(false);

    }
  };

  // --------------------------------
  // End Election
  // --------------------------------

  const endElection = async () => {

    try {

      setLoading(true);

      setStatus(
        "Confirm End Election in MetaMask..."
      );

      const tx =
        await contract.endElection();

      await tx.wait();

      await loadBlockchainData();

      setStatus(
        "Election ended successfully."
      );

    } catch (error) {

      setStatus(
        getErrorMessage(error)
      );

    } finally {

      setLoading(false);

    }
  };

  // --------------------------------
  // Vote
  // --------------------------------

  const vote = async (
    candidateId
  ) => {

    try {

      setLoading(true);

      setStatus(
        "Confirm your vote in MetaMask..."
      );

      const tx =
        await contract.vote(
          candidateId
        );

      setStatus(
        "Recording your vote..."
      );

      await tx.wait();

      await loadBlockchainData();

      setStatus(
        "Vote recorded successfully."
      );

    } catch (error) {

      setStatus(
        getErrorMessage(error)
      );

    } finally {

      setLoading(false);

    }
  };

  // --------------------------------
  // Election status
  // --------------------------------

  const electionStatus =
    electionState === 0
      ? "Not Started"
      : electionState === 1
      ? "Voting Open"
      : "Election Ended";

  // --------------------------------
  // Winner calculation
  // --------------------------------

  const highestVotes =
    candidates.length > 0
      ? Math.max(
          ...candidates.map(
            (candidate) =>
              candidate.voteCount
          )
        )
      : 0;

  const winners =
    electionState === 2
      ? candidates.filter(
          (candidate) =>
            candidate.voteCount ===
            highestVotes
        )
      : [];

  // --------------------------------
  // Interface
  // --------------------------------

  return (

    <div className="app">

      {/* NAVBAR */}

      <nav className="navbar">

        <div>
          <h2>
            🗳 BlockVote
          </h2>
        </div>

        <div>

          {account ? (

            <div className="wallet-connected">

              <span className="green-dot">
                ●
              </span>

              {account.slice(
                0,
                6
              )}

              ...

              {account.slice(
                -4
              )}

            </div>

          ) : (

            <button
              className="wallet-btn"
              onClick={
                connectWallet
              }
            >
              Connect Wallet
            </button>

          )}

        </div>

      </nav>


      {/* HERO */}

      <section className="hero">

        <h1>
          Blockchain Voting System
        </h1>

        <p>
          Transparent and tamper-resistant
          voting powered by Ethereum.
        </p>

        <div
          className={`status-badge state-${electionState}`}
        >
          {electionStatus}
        </div>

      </section>


      {/* CONNECTION */}

      {!account && (

        <section className="card connect-card">

          <h2>
            Connect Your Wallet
          </h2>

          <p>
            Connect MetaMask to
            participate in the election.
          </p>

          <button
            onClick={connectWallet}
            disabled={loading}
          >
            Connect MetaMask
          </button>

          <button
            className="secondary-btn"
            onClick={switchToHardhat}
          >
            Switch to Hardhat Local
          </button>

        </section>

      )}


      {/* CONNECTED CONTENT */}

      {account && (

        <>

          {/* INFORMATION */}

          <section className="stats-grid">

            <div className="stat-card">

              <h3>
                Election Status
              </h3>

              <strong>
                {electionStatus}
              </strong>

            </div>


            <div className="stat-card">

              <h3>
                Candidates
              </h3>

              <strong>
                {candidates.length}
              </strong>

            </div>


            <div className="stat-card">

              <h3>
                Total Votes
              </h3>

              <strong>
                {totalVotes}
              </strong>

            </div>


            <div className="stat-card">

              <h3>
                Your Vote
              </h3>

              <strong>

                {hasVoted
                  ? "Submitted"
                  : "Not Voted"}

              </strong>

            </div>

          </section>


          {/* ADMIN PANEL */}

          {isAdmin && (

            <section className="card admin-card">

              <div className="section-heading">

                <div>

                  <h2>
                    👑 Election Admin Panel
                  </h2>

                  <p>
                    Manage candidates and
                    election status.
                  </p>

                </div>

              </div>


              {electionState === 0 && (

                <div className="admin-form">

                  <input
                    type="text"
                    placeholder="Enter candidate name"
                    value={
                      candidateName
                    }
                    onChange={(e) =>
                      setCandidateName(
                        e.target.value
                      )
                    }
                  />

                  <button
                    onClick={
                      addCandidate
                    }
                    disabled={loading}
                  >
                    Add Candidate
                  </button>

                </div>

              )}


              <div className="admin-actions">

                {electionState === 0 && (

                  <button
                    className="success-btn"
                    onClick={
                      startElection
                    }
                    disabled={
                      loading ||
                      candidates.length < 2
                    }
                  >
                    Start Election
                  </button>

                )}


                {electionState === 1 && (

                  <button
                    className="danger-btn"
                    onClick={
                      endElection
                    }
                    disabled={
                      loading
                    }
                  >
                    End Election
                  </button>

                )}


                <button
                  className="secondary-btn"
                  onClick={() =>
                    loadBlockchainData()
                  }
                >
                  Refresh Data
                </button>

              </div>


              {electionState === 0 &&
                candidates.length < 2 && (

                  <p className="warning-text">
                    Add at least two
                    candidates before
                    starting the election.
                  </p>

                )}

            </section>

          )}


          {/* CANDIDATES */}

          <section className="candidate-section">

            <div className="section-heading">

              <div>

                <h2>
                  Candidates
                </h2>

                <p>
                  Select your preferred
                  candidate.
                </p>

              </div>

            </div>


            {candidates.length === 0 ? (

              <div className="card empty-card">

                No candidates added yet.

              </div>

            ) : (

              <div className="candidate-grid">

                {candidates.map(
                  (candidate) => {

                    const percentage =
                      totalVotes === 0
                        ? 0
                        : (
                            (candidate.voteCount /
                              totalVotes) *
                            100
                          ).toFixed(1);

                    return (

                      <div
                        className="candidate-card"
                        key={
                          candidate.id
                        }
                      >

                        <div className="candidate-avatar">

                          {candidate.name
                            .charAt(0)
                            .toUpperCase()}

                        </div>


                        <h3>
                          {
                            candidate.name
                          }
                        </h3>


                        <p>
                          Candidate #
                          {
                            candidate.id
                          }
                        </p>


                        {electionState === 2 && (

                          <div className="result-area">

                            <strong>
                              {
                                candidate.voteCount
                              }{" "}
                              Votes
                            </strong>

                            <div className="progress-bar">

                              <div
                                className="progress"
                                style={{
                                  width: `${percentage}%`,
                                }}
                              />

                            </div>

                            <span>
                              {
                                percentage
                              }
                              %
                            </span>

                          </div>

                        )}


                        {electionState === 1 && (

                          <button
                            className="vote-btn"
                            disabled={
                              loading ||
                              hasVoted
                            }
                            onClick={() =>
                              vote(
                                candidate.id
                              )
                            }
                          >

                            {hasVoted
                              ? "Vote Submitted"
                              : `Vote for ${candidate.name}`}

                          </button>

                        )}

                      </div>

                    );
                  }
                )}

              </div>

            )}

          </section>


          {/* VOTING MESSAGE */}

          {electionState === 1 &&
            hasVoted && (

              <div className="success-message">

                ✅ Your vote has been
                recorded on the blockchain.

              </div>

            )}


          {/* RESULTS */}

          {electionState === 2 &&
            candidates.length > 0 && (

              <section className="card winner-card">

                <h2>
                  🏆 Election Result
                </h2>

                {highestVotes === 0 ? (

                  <p>
                    No votes were cast.
                  </p>

                ) : winners.length === 1 ? (

                  <>

                    <h1>
                      {
                        winners[0].name
                      }
                    </h1>

                    <p>
                      Winner with{" "}
                      {
                        winners[0]
                          .voteCount
                      }{" "}
                      votes.
                    </p>

                  </>

                ) : (

                  <>

                    <h3>
                      Election Tie
                    </h3>

                    <p>

                      {winners
                        .map(
                          (winner) =>
                            winner.name
                        )
                        .join(", ")}

                    </p>

                  </>

                )}

              </section>

            )}


          {/* BLOCKCHAIN DETAILS */}

          <section className="card blockchain-info">

            <h2>
              Blockchain Information
            </h2>

            <div className="info-row">

              <span>
                Connected Wallet
              </span>

              <code>
                {account}
              </code>

            </div>


            <div className="info-row">

              <span>
                Contract Address
              </span>

              <code>
                {CONTRACT_ADDRESS}
              </code>

            </div>


            <div className="info-row">

              <span>
                Election Admin
              </span>

              <code>
                {adminAddress}
              </code>

            </div>


            <div className="info-row">

              <span>
                Network
              </span>

              <strong>
                Hardhat Local
              </strong>

            </div>

          </section>

        </>

      )}


      {/* STATUS */}

      <div className="transaction-status">

        {loading && (
          <span className="loader">
            ⏳
          </span>
        )}

        {status}

      </div>


      <footer>

        Blockchain Voting System
        • Ethereum • Hardhat • React

      </footer>

    </div>

  );
}

export default App;