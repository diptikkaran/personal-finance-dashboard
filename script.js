/* =========================
   In-memory DB & helpers
   ========================= */ 

// demo admin (kept in script only for first login)
const users = {
  admin: { role: "admin", password: "admin123" }
};

// pending customers (registered but not activated)
const pendingCustomers = []; // { username, email, phone, date }

// deposit/withdraw requests
const requests = []; // { id, customer, type, amount, note, date, status, handledBy }

// completed transactions
const transactions = []; // { id, customer, type, amount, date, processedBy }

let txCounter = 1000;
let reqCounter = 2000;
let currentUser = null;

function today() { return new Date().toISOString().split("T")[0]; }
function nextTxnId() { return "T" + (++txCounter); }
function nextReqId() { return "R" + (++reqCounter); }

/* =========================
   UI section toggles
   ========================= */
function showSection(sectionId) {
  const ids = ["loginForm", "registerForm", "adminDashboard", "employeeDashboard", "customerDashboard"];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (id === sectionId) ? "block" : "none";
  });
}
function showLogin() { showSection("loginForm"); }
function showRegister() { showSection("registerForm"); }

/* =========================
   Registration
   ========================= */
function registerCustomer() {
  const name = (document.getElementById("regName").value || "").trim().toLowerCase();
  const email = (document.getElementById("regEmail").value || "").trim();
  const phone = (document.getElementById("regPhone").value || "").trim();

  if (!name) return alert("Enter username.");
  if (users[name] || pendingCustomers.find(c => c.username === name)) {
    return alert("❌ Username already exists or pending.");
  }
  pendingCustomers.push({ username: name, email, phone, date: today() });
  alert("✅ Registered. An employee will activate your account.");
  document.getElementById("regName").value = "";
  document.getElementById("regEmail").value = "";
  document.getElementById("regPhone").value = "";
  showLogin();
}

/* =========================
   Admin: create / list / remove employees
   ========================= */
function createEmployee() {
  const username = (document.getElementById("newEmpUsername").value || "").trim().toLowerCase();
  const password = (document.getElementById("newEmpPassword").value || "").trim();
  const subRole = document.getElementById("newEmpRole").value; // 'activate'|'approve'
  if (!username || !password) return alert("Enter username & password.");
  if (users[username]) return alert("❌ Username already exists.");
  users[username] = { role: "employee", subRole, password };
  alert(`✅ Employee ${username} created as ${subRole}.`);
  document.getElementById("newEmpUsername").value = "";
  document.getElementById("newEmpPassword").value = "";
  renderEmployeeList();
}

function resetEmployeePassword() {
  const u = (document.getElementById("reUsername").value || "").trim().toLowerCase();
  const p = (document.getElementById("reNewPassword").value || "").trim();
  if (!users[u] || users[u].role !== "employee") return alert("❌ Employee not found.");
  if (!p) return alert("Enter new password.");
  users[u].password = p;
  alert("✅ Employee password reset.");
  document.getElementById("reUsername").value = "";
  document.getElementById("reNewPassword").value = "";
  renderEmployeeList();
}

function removeEmployee(username) {
  if (!users[username] || users[username].role !== "employee") return alert("No such employee.");
  delete users[username];
  alert(`❌ Employee ${username} removed.`);
  renderEmployeeList();
}

/* =========================
   Login / Logout
   ========================= */
function login() {
  const username = (document.getElementById("loginUsername").value || "").trim().toLowerCase();
  const password = (document.getElementById("loginPassword").value || "").trim();
  const role = document.getElementById("role").value;
  if (!users[username]) return alert("❌ User not found!");
  if (users[username].password !== password) return alert("❌ Wrong password!");
  if (users[username].role !== role) return alert("❌ Wrong role!");
  currentUser = username;

  // clear credentials after success
  document.getElementById("loginUsername").value = "";
  document.getElementById("loginPassword").value = "";

  alert("✅ Login successful!");
  if (role === "admin") {
    loadAdminDashboard();
    showSection("adminDashboard");
  } else if (role === "employee") {
    loadEmployeeDashboard();
    showSection("employeeDashboard");
  } else {
    loadCustomerDashboard(username);
    showSection("customerDashboard");
  }
}

function logout() {
  currentUser = null;
  showLogin();
}

/* =========================
   Admin view
   ========================= */
function loadAdminDashboard() {
  renderEmployeeList();
  renderTransactionsTable();
  renderAdminTotals();
}

function renderEmployeeList() {
  const tbody = document.getElementById("employeeList");
  if (!tbody) return;
  tbody.innerHTML = "";
  Object.keys(users).forEach(u => {
    if (users[u].role === "employee") {
      const sub = users[u].subRole || "-";
      tbody.innerHTML += `<tr><td>${u}</td><td>${sub}</td>
        <td><button class="btn-inline" onclick="removeEmployee('${u}')">Remove</button></td></tr>`;
    }
  });
}

function renderAdminTotals() {
  let totalDep = 0, totalWith = 0;
  transactions.forEach(t => {
    if (t.type === "Deposit") totalDep += t.amount;
    if (t.type === "Withdraw") totalWith += t.amount;
  });
  document.getElementById("adminTotalDeposit").innerText = "₹" + totalDep;
  document.getElementById("adminTotalWithdraw").innerText = "₹" + totalWith;
  document.getElementById("adminNetBalance").innerText = "₹" + (totalDep - totalWith);
}

function filterAdminTransactions() {
  const d = document.getElementById("adminFilterDate").value;
  const tbody = document.getElementById("adminTransactionTable");
  if (!tbody) return;
  tbody.innerHTML = "";
  const list = d ? transactions.filter(t => t.date === d) : transactions;
  list.forEach(tx => {
    tbody.innerHTML += `<tr><td>${tx.id}</td><td>${tx.customer}</td><td>${tx.type}</td><td>₹${tx.amount}</td><td>${tx.date}</td><td>${tx.processedBy || "-"}</td></tr>`;
  });
}

/* =========================
   Employee view & actions
   ========================= */
function loadEmployeeDashboard() {
  const emp = users[currentUser];
  const label = document.getElementById("empSubRoleLabel");
  label.innerText = emp && emp.subRole ? (emp.subRole === "activate" ? "activate_customer" : "approve_request") : "(no sub-role)";

  // show/hide areas
  const activateArea = document.getElementById("activateArea");
  const approveArea = document.getElementById("approveArea");
  if (emp && emp.subRole === "activate") {
    activateArea.style.display = "block";
    approveArea.style.display = "none";
    renderPendingCustomersTable();
    renderEmployeeCustomerList();
  } else if (emp && emp.subRole === "approve") {
    activateArea.style.display = "none";
    approveArea.style.display = "block";
    renderPendingRequests();
  } else {
    activateArea.style.display = "none";
    approveArea.style.display = "none";
  }

  renderTransactionsTable();
}

function renderPendingCustomersTable() {
  const tbody = document.getElementById("pendingCustomersTable");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (pendingCustomers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4">No pending customers.</td></tr>`;
    return;
  }
  pendingCustomers.forEach(c => {
    tbody.innerHTML += `<tr><td>${c.username}</td><td>${escapeHtml(c.email)}</td><td>${escapeHtml(c.phone)}</td>
      <td><button class="btn-inline" onclick="quickActivate('${c.username}')">Activate</button></td></tr>`;
  });
}

function quickActivate(username) {
  const pwd = prompt(`Set password for ${username}:`);
  if (!pwd) return alert("Activation cancelled.");
  if (users[username]) return alert("Username already exists.");
  users[username] = { role: "customer", password: pwd, balance: 0, transactions: [], requests: [] };
  const idx = pendingCustomers.findIndex(c => c.username === username);
  if (idx >= 0) pendingCustomers.splice(idx, 1);
  alert(`✅ ${username} activated.`);
  renderPendingCustomersTable();
  renderEmployeeCustomerList();
}

function activateCustomer() {
  if (!currentUser) return alert("Login first.");
  const emp = users[currentUser];
  if (!emp || emp.role !== "employee" || emp.subRole !== "activate") return alert("Not authorized.");

  const username = (document.getElementById("empActivateUsername").value || "").trim().toLowerCase();
  const password = (document.getElementById("empActivatePassword").value || "").trim();
  const idx = pendingCustomers.findIndex(c => c.username === username);
  if (idx === -1) return alert("No such pending customer.");
  if (!password) return alert("Set a password.");
  users[username] = { role: "customer", password, balance: 0, transactions: [], requests: [] };
  pendingCustomers.splice(idx, 1);
  alert("✅ Customer activated.");
  document.getElementById("empActivateUsername").value = "";
  document.getElementById("empActivatePassword").value = "";
  renderPendingCustomersTable();
  renderEmployeeCustomerList();
}

function renderEmployeeCustomerList() {
  const tbody = document.getElementById("employeeCustomerList");
  if (!tbody) return;
  tbody.innerHTML = "";
  Object.keys(users).forEach(u => {
    if (users[u].role === "customer") {
      const bal = users[u].balance || 0;
      tbody.innerHTML += `<tr><td>${u}</td><td>₹${bal}</td><td><button class="btn-inline" onclick="removeCustomer('${u}')">Remove</button></td></tr>`;
    }
  });
}

function removeCustomer(username) {
  if (!currentUser) return alert("Login first.");
  if (!users[currentUser] || users[currentUser].role !== "employee") return alert("Not authorized.");
  if (!users[username] || users[username].role !== "customer") return alert("No such customer.");
  delete users[username];
  alert(`❌ Customer ${username} removed.`);
  renderEmployeeCustomerList();
}

/* reset customer password by employee */
function resetCustomerPassword() {
  const u = (document.getElementById("rcUsername").value || "").trim().toLowerCase();
  const p = (document.getElementById("rcNewPassword").value || "").trim();
  if (!users[u] || users[u].role !== "customer") return alert("Customer not found.");
  if (!p) return alert("Enter new password.");
  users[u].password = p;
  alert("✅ Customer password reset.");
  document.getElementById("rcUsername").value = "";
  document.getElementById("rcNewPassword").value = "";
}

/* =========================
   Requests (customer side)
   ========================= */
function addRequest(customer, type, amount, note = "") {
  if (!users[customer] || users[customer].role !== "customer") return alert("Customer not active.");
  const id = nextReqId();
  const r = { id, customer, type, amount, note, date: today(), status: "Pending", handledBy: "" };
  requests.push(r);
  users[customer].requests = users[customer].requests || [];
  users[customer].requests.push(r);
  alert(`✅ ${type} request submitted (${id}).`);
  if (currentUser === customer) loadCustomerDashboard(customer);
  renderPendingRequests();
}

function requestDeposit() {
  if (!currentUser) return alert("Login first.");
  if (!users[currentUser] || users[currentUser].role !== "customer") return alert("Not a customer.");
  const amt = parseFloat(document.getElementById("reqDepositAmount").value);
  const note = (document.getElementById("reqDepositNote").value || "").trim();
  if (!amt || amt <= 0) return alert("Enter valid amount.");
  addRequest(currentUser, "Deposit", amt, note);
  document.getElementById("reqDepositAmount").value = "";
  document.getElementById("reqDepositNote").value = "";
}

function requestWithdrawal() {
  if (!currentUser) return alert("Login first.");
  if (!users[currentUser] || users[currentUser].role !== "customer") return alert("Not a customer.");
  const amt = parseFloat(document.getElementById("reqWithdrawAmount").value);
  const note = (document.getElementById("reqWithdrawNote").value || "").trim();
  if (!amt || amt <= 0) return alert("Enter valid amount.");
  addRequest(currentUser, "Withdraw", amt, note);
  document.getElementById("reqWithdrawAmount").value = "";
  document.getElementById("reqWithdrawNote").value = "";
}

/* =========================
   Employee: approve / reject requests
   ========================= */
function renderPendingRequests() {
  const tbody = document.getElementById("pendingRequestsTable");
  if (!tbody) return;
  tbody.innerHTML = "";
  const pending = requests.filter(r => r.status === "Pending");
  if (pending.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">No pending requests.</td></tr>`;
    return;
  }
  pending.forEach(r => {
    tbody.innerHTML += `<tr>
      <td>${r.id}</td><td>${r.customer}</td><td>${r.type}</td><td>₹${r.amount}</td><td>${r.date}</td>
      <td>
        <button class="btn-inline" onclick="approveRequest('${r.id}')">Approve</button>
        <button class="btn-inline" onclick="rejectRequest('${r.id}')">Reject</button>
      </td></tr>`;
  });
}

function approveRequest(id) {
  const req = requests.find(r => r.id === id && r.status === "Pending");
  if (!req) return alert("Request not found or already handled.");
  if (!currentUser || !users[currentUser] || users[currentUser].role !== "employee" || users[currentUser].subRole !== "approve") {
    return alert("Not authorized to approve.");
  }
  // If withdraw and insufficient balance -> reject automatically
  if (req.type === "Withdraw" && (!users[req.customer] || (users[req.customer].balance || 0) < req.amount)) {
    req.status = "Rejected";
    req.handledBy = currentUser;
    alert("❌ Withdrawal rejected (insufficient balance).");
    renderPendingRequests();
    renderCustomerRequests(req.customer);
    return;
  }

  // process
  if (req.type === "Deposit") {
    users[req.customer].balance = (users[req.customer].balance || 0) + req.amount;
  } else {
    users[req.customer].balance = (users[req.customer].balance || 0) - req.amount;
  }
  req.status = "Approved";
  req.handledBy = currentUser;

  // create transaction
  const tx = { id: nextTxnId(), customer: req.customer, type: req.type, amount: req.amount, date: today(), processedBy: currentUser };
  transactions.push(tx);
  users[req.customer].transactions = users[req.customer].transactions || [];
  users[req.customer].transactions.push(tx);

  alert(`✅ Request ${id} approved, transaction ${tx.id} recorded.`);
  renderPendingRequests();
  renderCustomerRequests(req.customer);
  renderTransactionsTable();
  renderAdminTotals();
  renderEmployeeCustomerList();
}

function rejectRequest(id) {
  const req = requests.find(r => r.id === id && r.status === "Pending");
  if (!req) return alert("Request not found or already handled.");
  if (!currentUser || !users[currentUser] || users[currentUser].role !== "employee" || users[currentUser].subRole !== "approve") {
    return alert("Not authorized to reject.");
  }
  req.status = "Rejected";
  req.handledBy = currentUser;
  alert(`❌ Request ${id} rejected.`);
  renderPendingRequests();
  renderCustomerRequests(req.customer);
}

/* =========================
   Customer dashboard render
   ========================= */
function loadCustomerDashboard(username) {
  document.getElementById("customerName").innerText = username;
  document.getElementById("customerBalance").innerText = "₹" + (users[username].balance || 0);
  renderCustomerRequests(username);
  renderCustomerTransactions(username);
}

function renderCustomerRequests(username) {
  const tbody = document.getElementById("customerRequestsTable");
  if (!tbody) return;
  tbody.innerHTML = "";
  const myReqs = requests.filter(r => r.customer === username);
  if (myReqs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">No requests yet.</td></tr>`;
    return;
  }
  myReqs.forEach(r => {
    tbody.innerHTML += `<tr><td>${r.id}</td><td>${r.type}</td><td>₹${r.amount}</td><td>${r.date}</td><td>${r.status}</td><td>${r.handledBy || "-"}</td></tr>`;
  });
}

function renderCustomerTransactions(username) {
  const tbody = document.getElementById("customerTransactions");
  if (!tbody) return;
  tbody.innerHTML = "";
  const txs = users[username].transactions || [];
  if (txs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">No transactions yet.</td></tr>`;
    return;
  }
  txs.forEach(tx => {
    tbody.innerHTML += `<tr><td>${tx.id}</td><td>${tx.type}</td><td>₹${tx.amount}</td><td>${tx.date}</td><td>${tx.processedBy || "-"}</td></tr>`;
  });
}
function filterCustomerTransactions() {
  const d = document.getElementById("customerFilterDate").value;
  const username = currentUser;
  if (!username) return;
  const list = users[username].transactions || [];
  const filtered = d ? list.filter(t => t.date === d) : list;
  const tbody = document.getElementById("customerTransactions");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (filtered.length === 0) tbody.innerHTML = `<tr><td colspan="5">No transactions.</td></tr>`;
  filtered.forEach(tx => tbody.innerHTML += `<tr><td>${tx.id}</td><td>${tx.type}</td><td>₹${tx.amount}</td><td>${tx.date}</td><td>${tx.processedBy || "-"}</td></tr>`);
}

/* =========================
   Transactions rendering
   ========================= */
function renderTransactionsTable() {
  const adminT = document.getElementById("adminTransactionTable");
  const empT = document.getElementById("transactionTable");
  if (adminT) adminT.innerHTML = "";
  if (empT) empT.innerHTML = "";
  transactions.forEach(tx => {
    const row = `<tr><td>${tx.id}</td><td>${tx.customer}</td><td>${tx.type}</td><td>₹${tx.amount}</td><td>${tx.date}</td><td>${tx.processedBy || "-"}</td></tr>`;
    if (adminT) adminT.innerHTML += row;
    if (empT) empT.innerHTML += row;
  });
}

/* =========================
   Utilities
   ========================= */
function filterTransactions() {
  const d = document.getElementById("filterDate").value;
  const list = d ? transactions.filter(t => t.date === d) : transactions;
  const tbody = document.getElementById("transactionTable");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (list.length === 0) tbody.innerHTML = `<tr><td colspan="6">No transactions.</td></tr>`;
  list.forEach(tx => tbody.innerHTML += `<tr><td>${tx.id}</td><td>${tx.customer}</td><td>${tx.type}</td><td>₹${tx.amount}</td><td>${tx.date}</td><td>${tx.processedBy || "-"}</td></tr>`);
}

function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/[&<>"']/g, function (m) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]); });
}

/* =========================
   Init on load
   ========================= */
document.addEventListener("DOMContentLoaded", () => {
  showLogin();
  // seed demo: (optional) you can uncomment to test faster
  // users["emp_activate"] = { role: "employee", subRole: "activate", password: "123" };
  // users["emp_approve"] = { role: "employee", subRole: "approve", password: "123" };
  // pendingCustomers.push({ username: "alice", email: "alice@example.com", phone: "9999999999", date: today() });
  renderEmployeeList();
  renderPendingCustomersTable();
  renderPendingRequests();
  renderTransactionsTable();
  renderAdminTotals();
});
