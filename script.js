let cart = [];

function addToCart(cakeName, price) {
    cart.push({ name: cakeName, price: price });
    displayCart();
    alert(cakeName + " added to your cart!");
}

function displayCart() {
    const cartItems = document.getElementById("cartItems");
    const cartTotal = document.getElementById("cartTotal");

    cartItems.innerHTML = "";

    if (cart.length === 0) {
        cartItems.innerHTML = "<p>Your cart is empty. Add some delicious cakes!</p>";
    }

    cart.forEach(function(item, index) {
        cartItems.innerHTML += `
            <div class="cart-item">
                <div>
                    <h3>${item.name}</h3>
                    <p>Price: ₹${item.price}</p>
                </div>
                <button class="remove-btn" onclick="removeFromCart(${index})">Remove</button>
            </div>
        `;
    });

    cartTotal.innerText = getTotal();
}

function getTotal() {
    let total = 0;

    cart.forEach(function(item) {
        total += item.price;
    });

    return total;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    displayCart();
}

function checkout() {
    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }

    alert("Your total bill is ₹" + getTotal());
}

async function placeOrder(event) {
    console.log("PLACE ORDER FUNCTION STARTED");
    event.preventDefault();

    if (cart.length === 0) {
        alert("Please add cakes to your cart first!");
        return;
    }

    const name = document.getElementById("customerName").value;
    const phone = document.getElementById("customerPhone").value;
    const address = document.getElementById("customerAddress").value;
    const payment = document.getElementById("paymentMethod").value;

    try {
        const response = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                phone,
                address,
                payment,
                items: cart
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message);
        }

        alert("Order saved successfully!");
        cart = [];
        displayCart();
        document.getElementById("checkoutForm").reset();

    } catch (error) {
        alert("Order could not be saved: " + error.message);
    }
}

async function submitFeedback(event) {
    event.preventDefault();

    const name = document.getElementById("feedbackName").value;
    const rating = document.getElementById("feedbackRating").value;
    const message = document.getElementById("feedbackMessage").value;

    try {
        const response = await fetch("/api/feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, rating, message })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message);
        }

        alert("Thank you! Your feedback has been saved.");
        document.getElementById("feedbackForm").reset();

    } catch (error) {
        alert("Feedback could not be saved: " + error.message);
    }
}