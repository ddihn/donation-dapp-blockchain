// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DonationDApp {
    struct Gift {
        address donor; // 기부자 주소
        address beneficiary; // 수혜자 주소
        uint256 amount; // 기부된 이더 양
        uint256 timestamp; // TimeStamp (기부 시점)
    }

    address public owner; // Contract를 배포한 소유자 주소
    mapping(address => bool) public admins; // 각 주소가 관리자인지 여부를 T/f 로 저장
    Gift[] public gifts; // 모든 기부 기록을 저장하기 위한 Gift 구조체 배열
    mapping(address => Gift[]) private donationsByDonor; // 각 기부자 주소별 기부 내역

    // 기부가 들어왔을 때 기부자, 수혜자, 금액 기록
    event DonationReceived(address donor, address beneficiary, uint256 amount); 
    // 소유자가 새 관리자 추가 시 관리자 주소 기록
    event AdminAdded(address admin);
    // 소유자가 기존 관리자 제거 시 관리자 주소 기록
    event AdminRemoved(address admin);
    // 관리자가 출금 시 출금 대상 주소, 출금 금액 기록
    event FundsWithdrawn(address to, uint256 amount);

    // 함수 호출자가 소유자인지 검사
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    // 함수 호출자가 관리자에 등록되어 있는지 확인
    modifier onlyAdmin() {
        require(admins[msg.sender], "Not admin");
        _;
    }
    
    // Contract 배포 시 한번 실행, 배포 계정을 소유자, 관리자로 등록
    constructor() {
        owner = msg.sender;
        admins[owner] = true;
    }
    // 누구나 호출 가능, 함수 호출자에게 받은 이더를 수혜자에게 기부
    // 기부 기록을 gifts 배열에 저장, 기부자별 맵핑에도 저장
    function donate(address _beneficiary) external payable {
        require(msg.value > 0, "Zero donation");
        Gift memory newGift = Gift(msg.sender, _beneficiary, msg.value, block.timestamp);
        gifts.push(newGift);
        donationsByDonor[msg.sender].push(newGift);
        emit DonationReceived(msg.sender, _beneficiary, msg.value);
    }
    
    // 함수 호출자의 기부 내역 반환
    function getMyDonations() external view returns (Gift[] memory) {
        return donationsByDonor[msg.sender];
    }

    // Contract에 쌓인 총 이더 잔액 반환
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    // 소유자만 호출 가능, 특정 주소를 관리자로 등록
    function addAdmin(address _admin) external onlyOwner {
        admins[_admin] = true;
        emit AdminAdded(_admin);
    }
    // 소유자만 호출 가능, 특정 주소를 관리자에서 제거
    function removeAdmin(address _admin) external onlyOwner {
        admins[_admin] = false;
        emit AdminRemoved(_admin);
    }
    // 관리자, 소유자만 호출 가능, _to 주소로 _amount 만큼 이더 출금
    function withdraw(address payable _to, uint256 _amount) external onlyAdmin {
        require(address(this).balance >= _amount, "Insufficient balance");
        _to.transfer(_amount);
        emit FundsWithdrawn(_to, _amount);
    }
}
