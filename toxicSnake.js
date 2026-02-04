class ToxicSnake {
    constructor(x, y, initialPursueWeight = 0.45) {
        this.segments = [];
        this.baseMaxSpeed = random(4.5, 5.5); // Faster enemies
        this.baseMaxForce = random(0.15, 0.25);
        this.pursueWeight = initialPursueWeight;

        let head = new Vehicle(x, y);
        head.maxSpeed = this.baseMaxSpeed;
        head.maxForce = this.baseMaxForce;
        this.segments.push(head);

        for (let i = 0; i < 10; i++) {
            this.addSegment();
        }
    }

    addSegment() {
        let last = this.segments[this.segments.length - 1];
        let newSeg = new Vehicle(last.position.x, last.position.y);
        newSeg.maxSpeed = 5;
        newSeg.maxForce = 0.3;
        this.segments.push(newSeg);
    }

    update(obstacles, playerSnake) {
        let head = this.segments[0];

        // NPC Behavior combination
        let wanderForce = head.wander();
        let avoidForce = head.avoid(obstacles);

        // Pursue player head at variable weight
        let pursueForce = head.pursue(playerSnake.segments[0]);

        head.applyForce(wanderForce.mult(1 - this.pursueWeight));
        head.applyForce(pursueForce.mult(this.pursueWeight));
        head.applyForce(avoidForce.mult(1.5));
        head.boundaries(40);

        head.update();

        for (let i = 1; i < this.segments.length; i++) {
            let segment = this.segments[i];
            let prev = this.segments[i - 1];
            // Overlap segments for enemy snakes too
            let arriveForce = segment.arrive(prev.position, 40, 12);
            segment.applyForce(arriveForce);
            segment.update();
        }
    }

    display() {
        // Draw tail-to-head so the head sits on top
        for (let i = this.segments.length - 1; i >= 0; i--) {
            let inter = map(i, 0, this.segments.length, 0, 1);
            let c = lerpColor(color(34, 197, 94), color(88, 28, 135), inter);
            let size = map(i, 0, this.segments.length, 1.2, 0.5);

            if (i === 0) {
                // Body "socket" joint
                fill(c);
                noStroke();
                ellipse(this.segments[i].position.x, this.segments[i].position.y, 22 * size);

                // Glowy sharp head
                push();
                translate(this.segments[i].position.x, this.segments[i].position.y);
                rotate(this.segments[i].velocity.heading() + PI / 2);
                drawingContext.shadowBlur = 15;
                drawingContext.shadowColor = color(34, 197, 94);
                fill(c);
                noStroke();
                // Draw triangle with BASE at pivot (0,0) so it doesn't disconnect when turning
                triangle(-12, 5, 12, 5, 0, -25);
                // Eyes
                fill(255);
                ellipse(-5, -5, 5, 5);
                ellipse(5, -5, 5, 5);
                pop();
            } else {
                // Overlapping body circles
                fill(c);
                noStroke();
                ellipse(this.segments[i].position.x, this.segments[i].position.y, 22 * size);
            }
        }
    }

    setDifficulty(score) {
        let scale = 1 + score * 0.05;
        let head = this.segments[0];
        head.maxSpeed = constrain(this.baseMaxSpeed * scale, 0, 8);
        head.maxForce = constrain(this.baseMaxForce * scale, 0, 0.4);
    }
}
