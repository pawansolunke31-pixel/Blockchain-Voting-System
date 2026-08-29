// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Voting {

    address public admin;

    enum ElectionState {
        NotStarted,
        Started,
        Ended
    }

    ElectionState public electionState;

    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
    }

    uint256 public candidateCount;
    uint256 public totalVotes;

    mapping(uint256 => Candidate) public candidates;
    mapping(address => bool) public hasVoted;

    constructor() {
        admin = msg.sender;
        electionState = ElectionState.NotStarted;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier electionActive() {
        require(
            electionState == ElectionState.Started,
            "Election is not active"
        );
        _;
    }

    function addCandidate(string memory _name) public onlyAdmin {
        require(
            electionState == ElectionState.NotStarted,
            "Cannot add candidate now"
        );

        require(bytes(_name).length > 0, "Candidate name required");

        candidateCount++;

        candidates[candidateCount] = Candidate(
            candidateCount,
            _name,
            0
        );
    }

    function startElection() public onlyAdmin {
        require(candidateCount >= 2, "Add at least two candidates");

        require(
            electionState == ElectionState.NotStarted,
            "Election already started"
        );

        electionState = ElectionState.Started;
    }

    function vote(uint256 _candidateId) public electionActive {
        require(
            !hasVoted[msg.sender],
            "You have already voted"
        );

        require(
            _candidateId > 0 && _candidateId <= candidateCount,
            "Invalid candidate"
        );

        hasVoted[msg.sender] = true;
        candidates[_candidateId].voteCount++;
        totalVotes++;
    }

    function endElection() public onlyAdmin {
        require(
            electionState == ElectionState.Started,
            "Election is not running"
        );

        electionState = ElectionState.Ended;
    }
}