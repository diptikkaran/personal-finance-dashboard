let income = 0;
let expense = 0;

function addTransaction() {
    const description = document.getElementById("description").value;
    const amount = parseFloat(document.getElementById("amount").value);
    const type = document.getElementById("type").value;

    if (description === "" || isNaN(amount) || amount <= 0) {
        alert("Please enter valid details.");
        return;
    }

    const list = document.getElementById("transactionList");
    const item = document.createElement("li");
    item.textContent = `${description} - ₹${amount}`;
    list.appendChild(item);

    if (type === "income") {
        income += amount;
    } else {
        expense += amount;
    }

    updateSummary();

    // Clear inputs
    document.getElementById("description").value = "";
    document.getElementById("amount").value = "";
}

function updateSummary() {
    const balance = income - expense;
    document.getElementById("income").textContent = income;
    document.getElementById("expense").textContent = expense;
    document.getElementById("balance").textContent = balance;
}
