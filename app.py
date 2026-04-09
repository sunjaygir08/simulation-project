from flask import Flask, render_template, request, jsonify, flash, redirect, url_for
import random
import json
from datetime import datetime

app = Flask(__name__)
app.secret_key = "smart_warehouse_secret_2024"

# ─────────────────────────────────────────────
#  Dummy data generators
# ─────────────────────────────────────────────

def get_dashboard_data():
    return {
        "total_robots"      : 5,
        "active_robots"     : random.randint(2, 5),
        "idle_robots"       : random.randint(0, 2),
        "total_orders"      : random.randint(80, 120),
        "completed_orders"  : random.randint(60, 100),
        "pending_orders"    : random.randint(5, 20),
        "system_efficiency" : round(random.uniform(82, 98), 1),
        "avg_completion"    : round(random.uniform(4.2, 9.8), 1),
        "avg_utilization"   : round(random.uniform(70, 95), 1),
        "warehouse_capacity": 500,
        "current_inventory" : random.randint(300, 480),
        "items_delivered"   : random.randint(200, 400),
        "last_updated"      : datetime.now().strftime("%H:%M:%S"),
        "hourly_throughput" : [random.randint(10, 40) for _ in range(12)],
        "robot_utilization" : [round(random.uniform(60, 98), 1) for _ in range(5)],
        "order_status"      : {
            "completed" : random.randint(60, 90),
            "pending"   : random.randint(5, 15),
            "failed"    : random.randint(0, 5),
        },
    }


# ─────────────────────────────────────────────
#  Routes
# ─────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/dashboard")
def dashboard():
    data = get_dashboard_data()
    return render_template("dashboard.html", data=data)


@app.route("/api/dashboard-refresh")
def dashboard_refresh():
    """AJAX endpoint – returns fresh dummy stats as JSON."""
    return jsonify(get_dashboard_data())


@app.route("/simulation")
def simulation():
    return render_template("simulation.html")


@app.route("/about")
def about():
    return render_template("about.html")


@app.route("/contact", methods=["GET", "POST"])
def contact():
    if request.method == "POST":
        name    = request.form.get("name", "").strip()
        email   = request.form.get("email", "").strip()
        message = request.form.get("message", "").strip()

        errors = []
        if not name:
            errors.append("Name is required.")
        if not email or "@" not in email:
            errors.append("A valid email is required.")
        if not message:
            errors.append("Message cannot be empty.")

        if errors:
            return render_template("contact.html", errors=errors,
                                   form_data={"name": name, "email": email, "message": message})

        # In a real app you would send an email / save to DB here.
        flash("Message sent successfully! We'll get back to you soon.", "success")
        return redirect(url_for("contact"))

    return render_template("contact.html", errors=[], form_data={})


# ─────────────────────────────────────────────
#  Entry point
# ─────────────────────────────────────────────

if __name__ == "__main__":
    app.run(debug=True)
