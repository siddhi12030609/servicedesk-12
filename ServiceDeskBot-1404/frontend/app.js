
const API = "http://127.0.0.1:8000";
Chart.register(ChartDataLabels);
let currentUser = null;
let logoutTimer;
let currentPage = 1;
const rowsPerPage = 100;
let allUsers = [];

// ================= INIT =================
document.addEventListener("DOMContentLoaded", function () {

  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) loginBtn.addEventListener("click", handleLogin);

  // ✅ restore session
  const savedUser = localStorage.getItem("user");

  if (savedUser) {
    const user = JSON.parse(savedUser);
    currentUser = user;
    startDashboard(user);
    startSessionWatcher(); 
  }
});

// ================= LOGIN =================
async function handleLogin() {

  console.log("🚀 Calling login API...");

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch(API + "/login", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({email, password})
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      alert(data.error || "Login failed");
      return;
    }

    // ✅ FIX
    currentUser = data;

    // ✅ SAVE FULL OBJECT (important)
    localStorage.setItem("user", JSON.stringify(data));

    startDashboard(data);
    resetAutoLogout();
    startSessionWatcher();

  } catch (err) {
    console.error(err);
    alert("Server not reachable");
  }
}

// ================= DASHBOARD =================
function startDashboard(user){

  currentUser = user;

  document.getElementById("homePage").style.display = "none";
  document.getElementById("newDashboard").classList.remove("hidden");

  document.getElementById("profileName").innerText = user.email;

  if(user.role === "admin"){
  document.getElementById("adminRequestsMenu").style.display = "block";
  document.getElementById("adminUsersMenu").style.display = "block";
  document.getElementById("adminSessionsMenu").style.display = "block";
  document.getElementById("userMyRequestsMenu").style.display = "none";
  } 
  else if(user.role === "manager"){
    document.getElementById("adminRequestsMenu").style.display = "block"; // manager needs this
    document.getElementById("adminUsersMenu").style.display = "none";
    document.getElementById("adminSessionsMenu").style.display = "none";
    document.getElementById("userMyRequestsMenu").style.display = "none";
  }
  else {
    document.getElementById("adminRequestsMenu").style.display = "none"; // ✅ FIX
    document.getElementById("adminUsersMenu").style.display = "none";
    document.getElementById("adminSessionsMenu").style.display = "none";
    document.getElementById("userMyRequestsMenu").style.display = "block";
  }
  if(user.role !== "admin"){
  document.querySelector("li[onclick=\"showSection('groups')\"]").style.display = "none";
  }
  document.getElementById("chatContainer").classList.remove("hidden");
  // ✅ IMPORTANT FIX (dashboard + data issue)
  
  loadRequests();
  loadUsers();

  showSection("dashboard");
}

// ================= NAVIGATION =================

function showSection(section){

  document.getElementById("dashboardSection").classList.add("hidden");
  document.getElementById("requestSection").classList.add("hidden");
  document.getElementById("userSection").classList.add("hidden");
  document.getElementById("sessionsSection").classList.add("hidden");
  document.getElementById("userRequestSection").classList.add("hidden");

  // ✅ ADD THIS LINE
  document.getElementById("groupsSection").classList.add("hidden");

  const user = currentUser;

  if(section === "dashboard"){
    document.getElementById("dashboardSection").classList.remove("hidden");
  }

  if(section === "requests"){

    // ✅ ADMIN + MANAGER → same screen
    if(user.role === "admin" || user.role === "manager"){

      document.getElementById("requestSection").classList.remove("hidden");
      document.getElementById("userRequestSection").classList.add("hidden");

      loadRequests(); // 👈 IMPORTANT

    } 
    else {
      document.getElementById("userRequestSection").classList.remove("hidden");
      document.getElementById("requestSection").classList.add("hidden");

      loadUserRequests();
    }
  }

  if(section === "users"){
    document.getElementById("userSection").classList.remove("hidden");
    loadUsers();
  }

  if(section === "sessions"){
    document.getElementById("sessionsSection").classList.remove("hidden");
    loadSessions();
  }

  if(section === "groups"){
    document.getElementById("groupsSection").classList.remove("hidden");
    loadGroups();
  }
}

// ================= REQUESTS =================
function loadRequests(){

  const user = currentUser;

  fetch(`${API}/requests`)
    .then(res => res.json())
    .then(data => {

      console.log("User:", currentUser.email);
      console.log("All Requests:", data);

      let table = document.querySelector("#requestTable tbody");
    if(!table) return;

    table.innerHTML = "";

    // ✅ ROLE BASED FILTER
    let filteredData = [];

    if(user.role === "admin"){
      filteredData = data;
    }
    else if(user.role === "manager"){

      const managerEmail = user.email.toLowerCase().trim();
      const managerName = managerEmail.split("@")[0];

      filteredData = data.filter(r => {

        if(!r.manager) return false;

        const reqManager = r.manager.toLowerCase().trim();

        // ✅ MATCH BOTH NAME + EMAIL POSSIBILITY
        return (
          reqManager === managerName || 
          reqManager === managerEmail
        );
      });

      console.log("Manager Requests:", filteredData); // DEBUG
    }
    else{
      filteredData = data.filter(r =>
        r.requested_by &&
        user.email &&
        r.requested_by.toLowerCase().trim() === user.email.toLowerCase().trim()
      );
    }

    filteredData.forEach(r => {

      let actions = "-";

      // ✅ MANAGER APPROVAL
      if(user.role === "manager" && (!r.manager_status || r.manager_status !== "Approved")){
        actions = `
          <button onclick="managerApprove(${r.id})">Manager Approve</button>
        `;
      }

      // ✅ ADMIN APPROVAL
      if(user.role === "admin"){
        actions = `
          ${r.manager_status !== "Approved"
            ? `<button onclick="managerApprove(${r.id})">Manager Approve</button>`
            : ""
          }

          ${r.status !== "Approved"
            ? `<button onclick="approveRequest(${r.id})">Admin Approve</button>`
            : ""
          }

          <button onclick="deleteRequest(${r.id})">Delete</button>
        `;
      }

      table.innerHTML += `
      <tr>
        <td>${r.id}</td>
        <td>${r.username || "-"}</td>
        <td>${r.user_email || "-"}</td>
        <td>${r.employee_id || "-"}</td>
        <td>${r.department || "-"}</td>
        <td>${r.manager || "-"}</td>
        <td>${r.role}</td>
        <td>${r.type}</td>

        <!-- ✅ STATUS UI -->
        <td>
          ${r.status === "Approved"
            ? `<span style="color:green;">✔ Approved</span>`
            : r.manager_status === "Approved"
              ? `<span style="color:orange;">Manager Approved</span>`
              : `<span style="color:red;">Pending</span>`
          }
        </td>

        <td>${r.requested_by}</td>
        <td>${actions}</td>
      </tr>
      `;
    });

    // ✅ Dashboard counts
    let dashboardData = currentUser.role === "admin"
      ? data
      : filteredData;

    document.getElementById("requestCount").innerText = dashboardData.length;

    document.getElementById("pendingCount").innerText =
      dashboardData.filter(r => r.status === "Pending").length;

    loadChart(dashboardData);
  });
}

// ================= USER REQUEST =================
function loadUserRequests(){

  const user = currentUser;

  fetch(API + "/requests")
  .then(res => res.json())
  .then(data => {

    let table = document.querySelector("#userRequestTable tbody");
    table.innerHTML = "";

    const filtered = data.filter(r =>
      r.requested_by === user.email
    );

    if(filtered.length === 0){
      table.innerHTML = `<tr><td colspan="11">No requests found</td></tr>`;
      return;
    }

    filtered.forEach(r => {
      table.innerHTML += `
        <tr>
          <td>${r.id}</td>
          <td>${r.username || "-"}</td>
          <td>${r.user_email}</td>
          <td>${r.employee_id}</td>
          <td>${r.department}</td>
          <td>${r.manager}</td>
          <td>${r.role}</td>
          <td>${r.type}</td>
          <td>${r.status}</td>
          <td>${r.requested_by}</td>
          <td>-</td>
        </tr>`;
    });
  });
}


// ================= CREATE REQUEST =================
function createRequestUser(){

  const user = currentUser;

  // ✅ detect which form is visible
  const isAdmin = !document.getElementById("requestSection").classList.contains("hidden");

  let username, email, empId, department, role, manager, type;

  if(isAdmin){
    // ADMIN FORM
    username = document.getElementById("reqUsername").value.trim();
    email = document.getElementById("reqEmail").value.trim();
    empId = document.getElementById("reqEmpId").value.trim();
    department = document.getElementById("reqDept").value;
    role = document.getElementById("reqRole").value;
    manager = document.getElementById("reqManager").value.trim();
    type = document.getElementById("reqType").value;
  } else {
    // USER FORM
    username = document.getElementById("usernameUserOnly").value.trim();
    email = document.getElementById("reqEmailUserOnly").value.trim();
    empId = document.getElementById("employeeIdUserOnly").value.trim();
    department = document.getElementById("departmentUserOnly").value;
    role = document.getElementById("reqRoleUserOnly").value;
    manager = document.getElementById("managerUserOnly").value.trim();
    type = document.getElementById("reqTypeUserOnly").value;
  }

  // ✅ validation
  if(!username || !email){
    alert("Please fill required fields");
    return;
  }

  let employeeId = empId;

  if(type === "Onboarding"){
    employeeId = "";
  }

  if(type === "Offboarding" && !employeeId){
    alert("Employee ID required for offboarding");
    return;
  }

  // 🔥 AUTO GROUP LOGIC
  let groupName = "";

  if(department === "IT") groupName = "AD-IT";
  else if(department === "HR") groupName = "AD-HR";
  else if(department === "FINANCE") groupName = "AD-FINANCE";

  const payload = {
    username,
    user_email: email,
    employee_id: employeeId,
    department: department || "-",
    manager: manager || "-",
    role,
    type,
    requested_by: user.email
  };

  fetch(API + "/requests", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(data => {

    if(data.error){
      alert(data.error);
      return;
    }

    // 🔥 AUTO ASSIGN GROUP
    if(groupName){
      fetch(API + "/groups/add-user", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          email: email,
          group: groupName
        })
      });
    }

    alert("Request Created ✅");

    loadRequests();
    loadUserRequests();
  });
}

function renderUsersTable(data){

  let table = document.querySelector("#usersTable tbody");
  if(!table) return;

  table.innerHTML = "";

  if(data.length === 0){
    table.innerHTML = `<tr><td colspan="8">No users found</td></tr>`;
    return;
  }

  data.forEach(u => {

    const status = u.active ? "Active" : "Disabled";

    table.innerHTML += `
      <tr>
        <td>${u.email ? u.email.split("@")[0] : "-"}</td>
        <td>${u.email || "-"}</td>
        <td>${u.employee_id || "-"}</td>
        <td>${u.department || "-"}</td>
        <td>${u.manager || "-"}</td>
        <td>${u.role || "-"}</td>
        <td>${status}</td>
        <td>
          <button onclick="enableUser('${u.email}')">Enable</button>
          <button onclick="disableUser('${u.email}')">Disable</button>
          <button onclick="deleteUser('${u.email}')">Delete</button>
        </td>
      </tr>
    `;
  });
}

// ================= USERS =================

function loadUsers() {

  fetch(API + "/users")
    .then(res => res.json())
    .then(data => {

      console.log("ALL USERS:", data);

      // ✅ store globally
      allUsers = data;

      // ✅ reset filters (IMPORTANT)
      document.getElementById("userSearch").value = "";
      document.getElementById("userDeptFilter").value = "";
      document.getElementById("userStatusFilter").value = "";

      // ✅ user count
      document.getElementById("userCount").innerText = data.length;

      // ✅ chart
      loadUserChart(data);

      // ✅ render table
      renderUsersTable(data);

    })
    .catch(err => {
      console.error("Error loading users:", err);
    });
}

async function deleteUser(email){

  try{

    const res = await fetch(API + "/users/" + email, {
      method:"DELETE"
    });

    if(!res.ok){
      addMessage("Bot", "❌ Failed to delete user");
      return;
    }

    addMessage("Bot", `🗑️ User ${email} deleted successfully`);

    loadUsers(); // refresh UI

  } catch(err){
    console.error(err);
    addMessage("Bot", "❌ Server error while deleting");
  }
}


function enableUser(email) {
  fetch(`${API}/users/${email}/enable`, { method: "PUT" })
  .then(() => loadUsers());
}

function disableUser(email) {
  fetch(`${API}/users/${email}/disable`, { method: "PUT" })
  .then(() => loadUsers());
}

// ================= SESSIONS =================

function loadSessions(){

  fetch(API + "/sessions")
  .then(res => res.json())
  .then(data => {

    let table = document.querySelector("#sessionsTable tbody");
    if(!table) return;

    table.innerHTML = "";

    if(data.length === 0){
      table.innerHTML = `<tr><td colspan="6">No sessions found</td></tr>`;
      return;
    }

    data.forEach(s => {

      const email = s.email || "-";
      const username = email.includes("@") ? email.split("@")[0] : "-";
      const status = s.status 
        ? s.status.toLowerCase()
        : (s.logout_time ? "inactive" : "active");

      table.innerHTML += `
      <tr class="${status === 'active' ? 'active-row' : ''}">
        <td>${username}</td>
        <td>${email}</td>

        <td>${formatDateTime(s.login_time)}</td>
        <td>${s.logout_time ? formatDateTime(s.logout_time) : "-"}</td>

        <td>
          ${formatStatus(status)}

          ${currentUser.role === "admin" && status === "active"
            ? `<button class="danger-btn" onclick="forceLogout('${s.token}')">
                Force Logout
               </button>`
            : ""}
        </td>

        <td>${status === "active" ? "Running..." : formatDuration(s.duration)}</td>
      </tr>`;
    });

    startLiveTimers(data);
  });
}

// ================= UPDATE =================

function updateRequest(id, status){

  fetch(API + "/requests/" + id, {
    method: "PUT",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({status})
  })
  .then(res => res.json())
  .then(data => {
    if (data.message === "User created") {
        alert("User created! Password: " + data.temporary_password);
    } else {
        alert(data.message);
        setTimeout(() => {
        loadRequests();
    }, 200);
    }
    loadRequests();
    loadUserRequests();
  });
}
// ================= DELETE =================
function deleteRequest(id) {
  fetch(`${API}/requests/${id}`, {
    method: "DELETE"
  })
  .then(res => res.json())
  .then(() => loadRequests());
}

// ================= LOGOUT =================
function logout(){

  const user = JSON.parse(localStorage.getItem("user"));

  fetch(API + "/logout", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({token: user.token})
  });

  localStorage.clear();
  location.reload();
} 

function forceLogout(token){

  if(!confirm("Force logout this session?")) return;

  fetch(`${API}/sessions/${token}/force-logout`, {
    method: "PUT"
  })
  .then(res => res.json())
  .then(data => {
    loadSessions();
  });
}

function startSessionWatcher(){

  setInterval(() => {

    const user = JSON.parse(localStorage.getItem("user"));
    if(!user || !user.token) return;

    fetch(`${API}/sessions/check/${user.token}`)
    .then(res => res.json())
    .then(data => {

      if(data.valid === false){
        console.log("Session invalid, logging out");

        localStorage.removeItem("user");

        document.getElementById("newDashboard").classList.add("hidden");
        document.getElementById("homePage").style.display = "flex";

        clearInterval(); // stop loop
      }

    });

  }, 1000); // every 3 sec
}

// ================= AUTO LOGOUT =================
function resetAutoLogout(){
  clearTimeout(logoutTimer);
  logoutTimer = setTimeout(() => {
    alert("Session expired");
    logout();
  }, 5 * 60 * 1000);
}



// ================= FORGOT PASSWORD =================
function forgotPassword(){

  const email = document.getElementById("email").value;
  if(!email) return alert("Enter email");

  const newPassword = prompt("Enter new password");
  if(!newPassword) return;

  fetch(API + "/change-password", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({email, new_password: newPassword})
  })
  .then(res => res.json())
  .then(data => alert(data.message || data.error));
}

function loadChart(data) {

  const ctx = document.getElementById("requestChart");
  if (!ctx) return;

  let onboard = 0;
  let offboard = 0;
  let pending = 0;
  let approved = 0;

  data.forEach(r => {
    if (r.type === "Onboarding") onboard++;
    if (r.type === "Offboarding") offboard++;
    if (r.status === "Pending") pending++;
    if (r.status === "Approved") approved++;
  });

  // destroy old chart if exists
  if (window.myChart) {
    window.myChart.destroy();
  }

    window.myChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Onboarding", "Offboarding", "Pending", "Approved"],
      datasets: [{
        data: [onboard, offboard, pending, approved],
        backgroundColor: [
          "#4e73df",   // blue
          "#e74a3b",   // red
          "#f6c23e",   // yellow
          "#1cc88a"    // green
        ],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, 
      plugins: {
        legend: { position: "top" },
        tooltip: { enabled: true },
        datalabels: {
          color: "black",
          font: { weight: "bold" }
        }
      },
      cutout: "60%",
      animation: {
        animateRotate: true,
        duration: 1200
      }
    }
  });
}

function loadUserChart(users) {

  let active = users.filter(u => u.active).length;
  let inactive = users.length - active;

  const ctx = document.getElementById("userChart");
  if (!ctx) return;

  if (window.userChartInstance) {
    window.userChartInstance.destroy();
  }

  window.userChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Active", "Disabled"],
      datasets: [{
        label: "Users",
        data: [active, inactive],
        backgroundColor: ["#1cc88a", "#e74a3b"]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function formatDuration(duration){
  if(!duration) return "-";

  const parts = duration.split(":");

  const h = parseInt(parts[0]) || 0;
  const m = parseInt(parts[1]) || 0;
  const s = Math.floor(parseFloat(parts[2])) || 0;

  let result = "";

  if(h > 0) result += h + "h ";
  if(m > 0) result += m + "m ";
  if(s > 0) result += s + "s";

  return result.trim() || "0s";
}
let timerInterval;

function startLiveTimers(data){

  clearInterval(timerInterval); // ✅ prevent multiple loops

  timerInterval = setInterval(() => {

    data.forEach(s => {

      if(s.status === "active" && s.login_time){

        const loginTime = new Date(s.login_time);
        const now = new Date();

        const diff = Math.floor((now - loginTime) / 1000);

        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const sec = diff % 60;

        let result = "";
        if(h > 0) result += h + "h ";
        if(m > 0) result += m + "m ";
        result += sec + "s";

        const el = document.getElementById(`timer-${s.email}`);
        if(el) el.innerText = result;
      }

    });

  }, 1000);
}

function formatDateTime(dt){
  if(!dt) return "-";

  const d = new Date(dt);

  const date = d.toLocaleDateString("en-GB"); // 13/04/2026
  const time = d.toLocaleTimeString("en-IN"); // 10:45:23 PM

  return `${date} • ${time}`;
}

function formatStatus(status){
  if(status === "active"){
    return `<span style="color:#22c55e;font-weight:600;">🟢 Active</span>`;
  }
  return `<span style="color:#ef4444;font-weight:600;">🔴 Inactive</span>`;
}

function refreshApp() {
  loadRequests();
  loadUsers();
  loadSessions();
}

function editUser(email, role, empId){

  const newRole = prompt("Enter new role:", role);
  const newEmpId = prompt("Enter Employee ID:", empId);
  const newDept = prompt("Enter Department (IT / HR / FINANCE):");
  const newManager = prompt("Enter Manager:");

  if(!newRole || !newEmpId){
    alert("Role & Employee ID are required");
    return;
  }

  fetch(`${API}/users/update`, {
    method: "PUT",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      email: email,
      role: newRole,
      employee_id: newEmpId,
      department: newDept || "-",
      manager: newManager || "-"
    })
  })
  .then(res => res.json())
  .then(data => {
    alert(data.message);
    loadUsers();      // refresh users
    loadRequests();   // sync requests
  });
}

function openForgot(){

  const home = document.getElementById("homePage");
  const fp = document.getElementById("forgotScreen");

  if(home) home.style.display = "none";

  if(fp){
    fp.classList.remove("hidden");   // 🔥 VERY IMPORTANT
    fp.style.display = "flex";
  }
}

function closeForgot(){

  const home = document.getElementById("homePage");
  const fp = document.getElementById("forgotScreen");

  if(fp){
    fp.classList.add("hidden");   // 🔥 IMPORTANT
  }

  if(home){
    home.style.display = "flex";
  }
}

async function resetPassword(){

  const email = document.getElementById("fpEmail").value.trim();
  const password = document.getElementById("fpPassword").value.trim();

  if(!email || !password){
    alert("Fill all fields");
    return;
  }

  try{

    const res = await fetch(API + "/change-password", {
      method:"PUT",
      headers: {
        "Content-Type":"application/json"
      },
      body: JSON.stringify({
        email: email,
        new_password: password
      })
    });

    const data = await res.json();

    if(!res.ok){
      alert(data.message || "❌ Failed to update password");
      return;
    }

    alert("✅ Password updated successfully");

    localStorage.removeItem("user");   // ✅ ADD THIS LINE

    closeForgot();

  } catch(err){
    console.error(err);
    alert("❌ Server error");
  }
}

function createGroup(){
  const name = document.getElementById("groupName").value;

  fetch(API + "/groups", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({name})
  })
  .then(()=>loadGroups());
}

function loadGroups(){
  fetch(API + "/groups")
  .then(res=>res.json())
  .then(data=>{
    let table = document.querySelector("#groupsTable tbody");
    table.innerHTML = "";

    data.forEach(g=>{
      table.innerHTML += `
        <tr>
          <td>${g}</td>

          <td>
            <button onclick="manageGroup('${g}')">Manage Users</button>
          </td>

          <td>
            <button onclick="deleteGroup('${g}')">Delete</button>
          </td>
        </tr>
      `;
    });
  });
}

function deleteGroup(name){
  fetch(API + "/groups/" + name, {method:"DELETE"})
  .then(()=>loadGroups());
}

// ✅ ADD HERE (after all existing functions)
let currentGroup = "";

function manageGroup(group){

  currentGroup = group;

  // open modal
  document.getElementById("groupUsersModal").classList.remove("hidden");

  loadAllUsersForDropdown();

  fetch(API + "/groups/" + group)
  .then(res => res.json())
  .then(data => {

    let list = document.getElementById("groupUserList");
    list.innerHTML = "";

    if(data.length === 0){
      list.innerHTML = "<li>No users in this group</li>";
      return;
    }

    data.forEach(u=>{
    list.innerHTML += `
      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        background:#f1f5f9;
        padding:8px 12px;
        border-radius:8px;
        margin:5px 0;
      ">
        <span>${u.user_email}</span>
        <button onclick="removeUserDirect('${u.user_email}')"
          style="background:red;color:white;border:none;padding:5px 10px;border-radius:6px;">
          Remove
        </button>
      </div>
    `;
    });

  });
}

function closeGroupModal(){
  document.getElementById("groupUsersModal").classList.add("hidden");
}

function loadAllUsersForDropdown(){
  fetch(API + "/users")
  .then(res=>res.json())
  .then(data=>{
    let select = document.getElementById("groupUserSelect");
    select.innerHTML = "";

    data.forEach(u=>{
      select.innerHTML += `<option value="${u.email}">${u.email}</option>`;
    });
  });
}

function loadGroupUsers(){
  fetch(API + "/groups/" + currentGroup)
  .then(res=>res.json())
  .then(data=>{
    let list = document.getElementById("groupUserList");
    list.innerHTML = "";

    data.forEach(u=>{
      list.innerHTML += `
      <li style="
        padding:8px;
        margin:5px 0;
        background:#f1f5f9;
        border-radius:8px;
      ">
        👤 ${u.user_email}
      </li>`;
    });
  });
}

function addUserToGroup(){
  const email = document.getElementById("groupUserSelect").value;

  fetch(API + "/groups/add-user", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ email, group: currentGroup })
  }).then(()=> loadGroupUsers());
}

function removeUserFromGroup(){
  const email = document.getElementById("groupUserSelect").value;

  fetch(API + "/groups/remove-user", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ email, group: currentGroup })
  }).then(()=> loadGroupUsers());
}

function removeUserDirect(email){

  fetch(API + "/groups/remove-user", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      email: email,
      group: currentGroup
    })
  }).then(()=> loadGroupUsers());
}

function filterSessions(){

  const search = document.getElementById("sessionSearch").value.toLowerCase();
  const status = document.getElementById("sessionStatusFilter").value.toLowerCase();

  fetch(API + "/sessions")
  .then(res => res.json())
  .then(data => {

    let table = document.querySelector("#sessionsTable tbody");
    table.innerHTML = "";

    data.forEach(s => {

      const email = s.email || "-";
      const username = email.includes("@") ? email.split("@")[0] : "-";
      const sStatus = (s.status || "").toLowerCase();

      if(
        (email.toLowerCase().includes(search)) &&
        (!status || status === "" || sStatus === status)
      ){

        table.innerHTML += `
        <tr>
          <td>${username}</td>
          <td>${email}</td>
          <td>${formatDateTime(s.login_time)}</td>
          <td>${s.logout_time ? formatDateTime(s.logout_time) : "-"}</td>
          <td>${formatStatus(sStatus)}</td>
          <td>${formatDuration(s.duration)}</td>
        </tr>
        `;
      }

    });

  });
}

function filterUsers(){

  const search = document.getElementById("userSearch").value.toLowerCase();
  const dept = document.getElementById("userDeptFilter").value.toLowerCase();
  const status = document.getElementById("userStatusFilter").value.toLowerCase();

  let filtered = allUsers.filter(u => {

    const email = (u.email || "").toLowerCase();
    const userDept = (u.department || "").toLowerCase();
    const userStatus = u.active ? "active" : "disabled";

    return (
      email.includes(search) &&
      (dept === "" || dept === "all dept" || userDept === dept) &&
      (status === "" || status === "all status" || userStatus === status)
    );
  });

  renderUsersTable(filtered);
}

function managerApprove(id){
  fetch(API + "/requests/manager-approve/" + id, {
    method: "PUT"
  })
  .then(res => res.json())
  .then(data => {
    if(data.error){
      alert(data.error);
    } else {
      alert("Manager Approved ✅");
      loadRequests();
    }
  });
}

function approveRequest(id){
  fetch(API + "/requests/approve/" + id, { method: "PUT" })
  .then(res => res.json())
  .then(data => {

    if(data.error){
      alert(data.error);
      return;
    }

    alert("User Created ✅\nTemp Password: " + data.temp_password);

    loadRequests();
  });
}

function toggleChat(){
  const box = document.getElementById("chatBox");

  if(box.classList.contains("hidden")){
    box.classList.remove("hidden");
    showWelcome();   // ✅ trigger welcome here
  } else {
    box.classList.add("hidden");
  }
}

function showWelcome(){
  const chat = document.getElementById("chatMessages");

  if(chat.innerHTML.trim() === ""){
    chat.innerHTML = `
      <div class="msg bot-msg">
        👋 Welcome <b>${currentUser.email}</b> <br><br>

        I can help you with:<br>
        • View pending requests<br>
        • Approve requests<br>
        • Check sessions<br><br>

        Try clicking options below 👇
      </div>
    `;
  }
}

function quickMsg(text){
  document.getElementById("chatInput").value = text;
  sendChat();
}

function sendChat(){
  const input = document.getElementById("chatInput");
  const msg = input.value.trim();
  if(!msg) return;

  const chat = document.getElementById("chatMessages");

  chat.innerHTML += `<div class="msg user-msg">${msg}</div>`;
  input.value = "";

    if(msg.toLowerCase().startsWith("create user")){
    autoFillAndSubmitRequest(msg);
    return;
      }

  fetch("http://127.0.0.1:8000/chat", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({
      message: msg,
      role: currentUser.role,
      user: currentUser.email
    })
  })
  .then(res => res.json())
  .then(data => {
    chat.innerHTML += `<div class="msg bot-msg">${data.reply}</div>`;
    chat.scrollTop = chat.scrollHeight; // ✅ auto scroll
  });
}

async function sendChat(messageInput = null){

  const input = document.getElementById("chatInput");

  const msg = messageInput || input.value;

  if(!msg) return;

  addMessage("You", msg);

  try{
    const res = await fetch(API + "/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: msg,
        user_email: currentUser.email
      })
    });

    const data = await res.json();

    console.log("BOT RESPONSE:", data);

    // ✅ chatbot reply
    addMessage("Bot", data.reply || "No response");

    // =====================================
    // 🔥 ADD THIS BLOCK HERE (IMPORTANT)
    // =====================================
    if (data.action === "fill_form" && data.data) {

      showSection("requests"); // open form automatically

      document.getElementById("reqUsername").value = data.data.username;
      document.getElementById("reqEmail").value = data.data.email;
      document.getElementById("reqEmpId").value = data.data.empId;
      document.getElementById("reqDept").value = data.data.department;
      document.getElementById("reqRole").value = data.data.role;
      document.getElementById("reqManager").value = data.data.manager;
      document.getElementById("reqType").value = data.data.type;

    }

    // ===============================
    // 🔥 EXISTING UI CONTROL
    // ===============================

    const lower = msg.toLowerCase();

    if(lower.includes("pending") || lower.includes("requests")){
      showSection("requests");
      loadRequests();
    }

    if(lower.includes("approve request")){
      const id = parseInt(msg.split(" ").pop());
      if(!isNaN(id)){
        approveRequest(id);
      }
    }

    if(lower.includes("manager approve")){
      const id = parseInt(msg.split(" ").pop());
      if(!isNaN(id)){
        managerApprove(id);
      }
    }

   // if(lower.includes("delete user")){
      //const email = msg.split(" ").pop();
      //deleteUser(email);
    //}

    if(lower.includes("create request")){
      showSection("requests");
    }

    // 🔴 DELETE USER COMMAND
    if(lower === "delete user"){

    // 🔐 role check
    if(currentUser.role !== "admin" && currentUser.role !== "manager"){
      addMessage("Bot", "❌ You are not allowed to delete users");
      return;
    }

    // ✅ updated message (important)
    addMessage("Bot", "Enter user email OR ID to delete:");

    chatState = "ask_delete_email";

    input.value = "";
    return;
  }

  } catch(err){
    console.error(err);
    addMessage("Bot", "❌ Server error");
  }

  input.value = "";
}

function addMessage(sender, text){
  const chat = document.getElementById("chatMessages");

  const msg = document.createElement("div");
  msg.classList.add("msg");

  if(sender === "You"){
    msg.classList.add("user-msg");
    msg.innerText = text;
  } else {
    msg.classList.add("bot-msg");
    msg.innerText = text;
  }

  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
}

function autoFillAndSubmitRequest(msg){

  const parts = msg.split(" ");

  // Expected: create user <name> <dept> <role> <manager>
  if(parts.length < 6){
    addMessage("Bot", "❌ Format: create user <name> <dept> <role> <manager>");
    return;
  }

  const username = parts[2];
  const department = parts[3].toUpperCase();
  const role = parts[4];
  const manager = parts[5];

  // 👉 Open request screen
  showSection("requests");

  setTimeout(() => {

    // 👉 Fill form
    document.getElementById("reqUsername").value = username;
    document.getElementById("reqEmail").value = username + "@test.com";
    document.getElementById("reqDept").value = department;
    document.getElementById("reqRole").value = role;
    document.getElementById("reqManager").value = manager;
    document.getElementById("reqType").value = "Onboarding";

    addMessage("Bot", `🧠 Filled form for ${username}`);

    // 👉 AUTO SUBMIT
    createRequestUser();

    addMessage("Bot", "✅ Request submitted");

  }, 500); // small delay to ensure UI loads

}

function loginSuccess(user){
  currentUser = user;

  document.getElementById("loginPage").style.display = "none";
  document.getElementById("mainApp").style.display = "block";

  // ✅ SHOW CHAT ONLY AFTER LOGIN
  document.getElementById("chatContainer").classList.remove("hidden");

  loadRequests();
}

function quickChat(text){
  document.getElementById("chatInput").value = text;
  sendChat();
}

// ================= UI =================
function showCreateForm(){
  document.getElementById("createForm").style.display = "block";
}

function resetChat(){

  const chat = document.getElementById("chatMessages");

  // ✅ clear UI
  chat.innerHTML = "";

  // ✅ reset states
  chatState = null;
  requestData = {};

  // ✅ clear input
  const input = document.getElementById("chatInput");
  if(input) input.value = "";

  // ✅ show fresh welcome
  showWelcome();

}