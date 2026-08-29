export const CONTRACT_ADDRESS =
  "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export const VOTING_ABI = [
  "function admin() view returns (address)",
  "function electionState() view returns (uint8)",
  "function candidateCount() view returns (uint256)",
  "function totalVotes() view returns (uint256)",

  "function candidates(uint256) view returns (uint256 id, string name, uint256 voteCount)",

  "function hasVoted(address) view returns (bool)",

  "function addCandidate(string _name)",
  "function startElection()",
  "function vote(uint256 _candidateId)",
  "function endElection()"
];