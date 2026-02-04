class Vehicle {
    constructor(x, y) {
        this.position = createVector(x, y);
        this.velocity = createVector(0, 0);
        this.acceleration = createVector(0, 0);
        this.maxSpeed = 5;
        this.maxForce = 0.25;
        this.wanderTheta = random(TWO_PI);
    }

    applyForce(force) {
        this.acceleration.add(force);
    }

    update() {
        this.velocity.add(this.acceleration);
        this.velocity.limit(this.maxSpeed);
        this.position.add(this.velocity);
        this.acceleration.mult(0);
    }

    seek(target) {
        let desired = p5.Vector.sub(target, this.position);
        desired.setMag(this.maxSpeed);
        let steer = p5.Vector.sub(desired, this.velocity);
        steer.limit(this.maxForce);
        return steer;
    }

    arrive(target, range = 100, stopDistance = 0) {
        let desired = p5.Vector.sub(target, this.position);
        let d = desired.mag();
        if (d < stopDistance) {
            this.velocity.mult(0);
            return createVector(0, 0);
        }
        if (d < range) {
            let m = map(d, stopDistance, range, 0, this.maxSpeed);
            desired.setMag(m);
        } else {
            desired.setMag(this.maxSpeed);
        }
        let steer = p5.Vector.sub(desired, this.velocity);
        steer.limit(this.maxForce);
        return steer;
    }

    pursue(vehicle) {
        let target = vehicle.position.copy();
        let prediction = vehicle.velocity.copy();
        prediction.mult(10);
        target.add(prediction);
        return this.seek(target);
    }

    evade(vehicle) {
        let pursuit = this.pursue(vehicle);
        pursuit.mult(-1);
        return pursuit;
    }

    wander() {
        let wanderPoint = this.velocity.copy();
        wanderPoint.setMag(100);
        wanderPoint.add(this.position);

        let wanderRadius = 50;
        let theta = this.wanderTheta + this.velocity.heading();
        let x = wanderRadius * cos(theta);
        let y = wanderRadius * sin(theta);
        wanderPoint.add(x, y);

        let steer = this.seek(wanderPoint);
        this.wanderTheta += random(-0.5, 0.5);
        return steer;
    }

    avoid(obstacles) {
        let steer = createVector(0, 0);
        let count = 0;
        for (let obs of obstacles) {
            let d = p5.Vector.dist(this.position, obs.position);
            // Only attempt to avoid when very close to obstacle to allow collisions
            // to occur on contact rather than bouncing prematurely.
            if (d < obs.r + 12) {
                let diff = p5.Vector.sub(this.position, obs.position);
                diff.setMag(this.maxSpeed);
                steer.add(diff);
                count++;
            }
        }
        if (count > 0) {
            steer.div(count);
            steer.setMag(this.maxSpeed);
            steer = p5.Vector.sub(steer, this.velocity);
            steer.limit(this.maxForce * 2);
        }
        return steer;
    }

    boundaries(margin) {
        let desired = null;
        if (this.position.x < margin) {
            desired = createVector(this.maxSpeed, this.velocity.y);
        } else if (this.position.x > width - margin) {
            desired = createVector(-this.maxSpeed, this.velocity.y);
        }

        if (this.position.y < margin) {
            desired = createVector(this.velocity.x, this.maxSpeed);
        } else if (this.position.y > height - margin) {
            desired = createVector(this.velocity.x, -this.maxSpeed);
        }

        if (desired !== null) {
            desired.setMag(this.maxSpeed);
            let steer = p5.Vector.sub(desired, this.velocity);
            steer.limit(this.maxForce * 1.5);
            this.applyForce(steer);
        }
    }
}
