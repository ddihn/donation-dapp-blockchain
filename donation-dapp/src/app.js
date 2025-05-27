let web3 = new Web3(new Web3.providers.HttpProvider("이더리움 네트워크"));

const contractAddress = "생성된 계약 주소";
const contractABI = []; // ABI
const contract = new web3.eth.Contract(contractABI, contractAddress);

let allAccounts = [];
let adminAddresses = [];
let ownerAddress = "";
let currentAccount = "";

window.addEventListener("load", async () => {
  try {
    allAccounts = await web3.eth.getAccounts();
    ownerAddress = await contract.methods.owner().call();
    await refreshAdmins();
    populateAllSelects();
    populateCurrentAccountSelect();
    currentAccount = allAccounts[0];
    updateRoleUI();
    updateStats();
  } catch (err) {
    console.error(err);
    showWarningBanner("❌ 초기화 중 오류 발생: " + err.message);
  }
});

function populateCurrentAccountSelect() {
  const select = document.getElementById("currentAccount");
  select.innerHTML = "";
  allAccounts.forEach((addr) => {
    const option = document.createElement("option");
    option.value = addr;
    option.text = addr;
    select.appendChild(option);
  });
}

function updateCurrentAccount() {
  const select = document.getElementById("currentAccount");
  currentAccount = select.value;
  updateRoleUI();
}

function updateRoleUI() {
  const isOwner = currentAccount.toLowerCase() === ownerAddress.toLowerCase();
  const isAdmin = adminAddresses.includes(currentAccount);
  const roleLabel = document.getElementById("currentRoleLabel");

  if (isOwner) {
    roleLabel.textContent = "소유자 계정으로 접속했습니다.";
    roleLabel.style.color = "darkorange";
  } else if (isAdmin) {
    roleLabel.textContent = "관리자 계정으로 접속했습니다.";
    roleLabel.style.color = "green";
  } else {
    roleLabel.textContent = "일반 사용자 계정으로 접속했습니다.";
    roleLabel.style.color = "gray";
  }

  console.log(
    `현재 사용자: ${currentAccount}, 소유자: ${isOwner}, 관리자: ${isAdmin}`
  );
}

async function refreshAdmins() {
  adminAddresses = [];
  for (const addr of allAccounts) {
    const isAdmin = await contract.methods.admins(addr).call();
    if (isAdmin) adminAddresses.push(addr);
  }
}

function populateSelect(selectId) {
  const select = document.getElementById(selectId);
  select.innerHTML = "";
  allAccounts.forEach((addr) => {
    const option = document.createElement("option");
    option.value = addr;
    option.text = adminAddresses.includes(addr) ? `${addr} [관리자]` : addr;
    if (adminAddresses.includes(addr)) {
      option.style.color = "green";
      option.style.fontWeight = "bold";
    }
    select.appendChild(option);
  });
}

function populateAllSelects() {
  populateSelect("beneficiarySelect");
  populateSelect("withdrawSelect");
  populateSelect("adminSelect");
}

function showTab(tab) {
  document
    .querySelectorAll("section")
    .forEach((sec) => sec.classList.remove("active"));
  document.getElementById(tab).classList.add("active");
}

function toggleGuide() {
  const modal = document.getElementById("guideModal");
  modal.style.display = modal.style.display === "block" ? "none" : "block";
}

async function updateStats() {
  try {
    const balance = await contract.methods.getBalance().call();
    document.getElementById("balance").innerText =
      "컨트랙트 잔액: " + web3.utils.fromWei(balance, "ether") + " ETH";
  } catch (err) {
    console.warn("잔액 정보 가져오기 실패:", err);
  }
}

function logTransaction(message, type = "info") {
  const logBox = document.getElementById("transactionLog");
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement("p");
  entry.textContent = `[${time}] ${message}`;
  entry.style.color =
    type === "success" ? "green" : type === "error" ? "red" : "black";
  logBox.appendChild(entry);
  logBox.scrollTop = logBox.scrollHeight;
}

async function donate() {
  const beneficiary = document.getElementById("beneficiarySelect").value;
  const amount = document.getElementById("amount").value;

  if (!web3.utils.isAddress(beneficiary)) {
    showWarningBanner("❌ 올바른 수혜자 주소를 선택하세요.");
    logTransaction("❌ 잘못된 수혜자 주소", "error");
    return;
  }
  if (isNaN(amount) || Number(amount) <= 0) {
    showWarningBanner("❌ 올바른 기부 금액을 입력하세요.");
    logTransaction("❌ 잘못된 기부 금액", "error");
    return;
  }

  try {
    await contract.methods.donate(beneficiary).send({
      from: currentAccount,
      value: web3.utils.toWei(amount, "ether"),
      gas: 300000,
    });
    showWarningBanner("✅ 기부 완료!");
    logTransaction(
      `✅ ${currentAccount} → ${beneficiary}에게 ${amount} ETH 기부`,
      "success"
    );
    updateStats();
  } catch (err) {
    console.error("기부 실패:", err);
    showWarningBanner(`❌ 기부 실패: ${err.message}`);
    logTransaction(`❌ 기부 실패: ${err.message}`, "error");
  }
}

async function withdraw() {
  const isAdmin = adminAddresses.includes(currentAccount);
  const isOwner = currentAccount.toLowerCase() === ownerAddress.toLowerCase();

  if (!isAdmin && !isOwner) {
    const message = "출금은 관리자나 소유자만 가능합니다.";
    showWarningBanner(`❌ ${message}`);
    logTransaction(`${message} (${currentAccount} 시도 차단됨)`, "error");
    return;
  }

  const to = document.getElementById("withdrawSelect").value;
  const amount = document.getElementById("withdrawAmount").value;

  if (!web3.utils.isAddress(to)) {
    showWarningBanner("❌ 올바른 출금 주소를 선택하세요.");
    logTransaction("❌ 잘못된 출금 주소", "error");
    return;
  }
  if (isNaN(amount) || Number(amount) <= 0) {
    showWarningBanner("❌ 올바른 출금 금액을 입력하세요.");
    logTransaction("❌ 잘못된 출금 금액", "error");
    return;
  }

  try {
    await contract.methods
      .withdraw(to, web3.utils.toWei(amount, "ether"))
      .send({
        from: currentAccount,
        gas: 300000,
      });
    showWarningBanner("✅ 출금 완료!");
    logTransaction(
      `✅ ${currentAccount} → ${to}로 ${amount} ETH 출금`,
      "success"
    );
    updateStats();
  } catch (err) {
    console.error("출금 실패:", err);
    showWarningBanner(`❌ 출금 실패: ${err.message}`);
    logTransaction(`❌ 출금 실패: ${err.message}`, "error");
  }
}

async function addAdmin() {
  const isOwner = currentAccount.toLowerCase() === ownerAddress.toLowerCase();

  if (!isOwner) {
    const message = "관리자 추가는 소유자만 가능합니다.";
    showWarningBanner(`❌ ${message}`);
    logTransaction(`${message} (${currentAccount} 시도 차단됨)`, "error");
    return;
  }

  const newAdmin = document.getElementById("adminSelect").value;

  if (!web3.utils.isAddress(newAdmin)) {
    showWarningBanner("❌ 올바른 관리자 주소를 선택하세요.");
    logTransaction("❌ 잘못된 관리자 주소", "error");
    return;
  }

  try {
    await contract.methods.addAdmin(newAdmin).send({
      from: currentAccount,
      gas: 300000,
    });
    showWarningBanner("✅ 관리자 추가 완료!");
    logTransaction(`✅ ${newAdmin} 관리자 추가됨`, "success");
    await refreshAdmins();
    populateAllSelects();
    updateRoleUI();
  } catch (err) {
    console.error("관리자 추가 실패:", err);
    showWarningBanner(`❌ 관리자 추가 실패: ${err.message}`);
    logTransaction(`❌ 관리자 추가 실패: ${err.message}`, "error");
  }
}

async function removeAdmin() {
  const isOwner = currentAccount.toLowerCase() === ownerAddress.toLowerCase();

  if (!isOwner) {
    const message = "관리자 제거는 소유자만 가능합니다.";
    showWarningBanner(`❌ ${message}`);
    logTransaction(`${message} (${currentAccount} 시도 차단됨)`, "error");
    return;
  }

  const targetAdmin = document.getElementById("adminSelect").value;

  if (!web3.utils.isAddress(targetAdmin)) {
    showWarningBanner("❌ 올바른 관리자 주소를 선택하세요.");
    logTransaction("❌ 잘못된 관리자 제거 주소", "error");
    return;
  }

  try {
    await contract.methods.removeAdmin(targetAdmin).send({
      from: currentAccount,
      gas: 300000,
    });
    showWarningBanner("✅ 관리자 제거 완료!");
    logTransaction(`✅ ${targetAdmin} 관리자 제거됨`, "success");
    await refreshAdmins();
    populateAllSelects();
    updateRoleUI();
  } catch (err) {
    console.error("관리자 제거 실패:", err);
    showWarningBanner(`❌ 관리자 제거 실패: ${err.message}`);
    logTransaction(`❌ 관리자 제거 실패: ${err.message}`, "error");
  }
}

function showWarningBanner(message) {
  const banner = document.getElementById("warningBanner");
  const msgSpan = document.getElementById("warningMessage");
  msgSpan.textContent = message;
  banner.style.display = "block";
  document.body.classList.add("has-banner");

  setTimeout(() => {
    banner.style.display = "none";
    document.body.classList.remove("has-banner");
  }, 4000); // 4초 후 자동 숨김
}
