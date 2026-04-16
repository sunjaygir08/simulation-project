from flask import Flask, render_template, request, jsonify, flash, redirect, url_for
import random
import json
from datetime import datetime

app = Flask(__name__)
app.secret_key = "smart_warehouse_secret_2024"

# ─────────────────────────────────────────────
#  Global simulation state
# ─────────────────────────────────────────────

global_simulation_state = {
    "total_robots"      : 4,
    "active_robots"     : 0,
    "idle_robots"       : 4,
    "total_orders"      : 0,
    "completed_orders"  : 0,
    "pending_orders"    : 0,
    "system_efficiency" : 0,
    "avg_completion"    : 0,
    "avg_utilization"   : 0,
    "warehouse_capacity": 500,
    "current_inventory" : 480,
    "items_delivered"   : 0,
    "last_updated"      : datetime.now().strftime("%H:%M:%S"),
    "hourly_throughput" : [12, 18, 25, 20, 30, 45, 38, 26, 32, 28, 15, 5],
    "robot_utilization" : [0 for _ in range(4)],
    "order_status"      : {"completed": 0, "pending": 0, "failed": 0},
}

def get_dashboard_data():
    global_simulation_state["last_updated"] = datetime.now().strftime("%H:%M:%S")
    return global_simulation_state


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
    """AJAX endpoint – returns live stats as JSON."""
    return jsonify(get_dashboard_data())


@app.route("/api/simulation-sync", methods=["POST"])
def simulation_sync():
    """Receives simulation updates from the client canvas."""
    data = request.json
    if not data:
        return jsonify({"status": "error"}), 400
        
    global global_simulation_state
    
    global_simulation_state["active_robots"] = data.get("active_robots", global_simulation_state["active_robots"])
    global_simulation_state["idle_robots"] = data.get("idle_robots", global_simulation_state["idle_robots"])
    global_simulation_state["total_orders"] = data.get("total_orders", global_simulation_state["total_orders"])
    global_simulation_state["completed_orders"] = data.get("completed_orders", global_simulation_state["completed_orders"])
    
    # Calculate derived stats
    total = global_simulation_state["total_orders"]
    completed = global_simulation_state["completed_orders"]
    
    global_simulation_state["pending_orders"] = max(0, total - completed)
    if total > 0:
        global_simulation_state["system_efficiency"] = round((completed / total) * 100, 1)
        
    # Make failures more obvious! 15% failure rate, plus instantly show 1 fail if there's any completion
    failed_orders = int(completed * 0.15)
    if completed > 2 and failed_orders == 0:
        failed_orders = 1
        
    global_simulation_state["order_status"] = {
        "completed": completed,
        "pending": global_simulation_state["pending_orders"],
        "failed": failed_orders
    }
    
    # Update latest throughput item to simulate real-time hourly addition
    global_simulation_state["hourly_throughput"][-1] = completed
    
    # Store robot specific data if needed
    if "robot_utilization" in data:
        util = data["robot_utilization"]
        global_simulation_state["robot_utilization"] = util
        if len(util) > 0:
            global_simulation_state["avg_utilization"] = round(sum(util) / len(util), 1)
            
    # Modify inventory based on completed orders (assuming each order removes 1 item)
    # Since completed_orders is cumulative for the session, let's keep track of previous
    prev_completed = global_simulation_state.get("_prev_completed", 0)
    diff = completed - prev_completed
    if diff > 0:
        global_simulation_state["current_inventory"] = max(0, global_simulation_state["current_inventory"] - diff)
        global_simulation_state["items_delivered"] += diff
        global_simulation_state["_prev_completed"] = completed

    return jsonify({"status": "success"})


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
