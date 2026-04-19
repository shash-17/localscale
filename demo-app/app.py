from flask import Flask
import math

app = Flask(__name__)

@app.route("/")
def home():
    return "LocalScale Demo App - Hit /compute to generate load"

@app.route("/compute")
def compute():
    """CPU-intensive endpoint: find prime numbers up to N"""
    primes = []
    for num in range(2, 15000):
        is_prime = True
        for i in range(2, int(math.sqrt(num)) + 1):
            if num % i == 0:
                is_prime = False
                break
        if is_prime:
            primes.append(num)
    return {"primes_found": len(primes), "largest": primes[-1]}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
