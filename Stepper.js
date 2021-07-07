/*
 * Stepper.js - Stepper library for the Raspberry Pi - Version 1.0.0
 *
 * Original CPP file: Stepper library for Wiring/Arduino - Version 1.1.0
 * from: https://github.com/arduino-libraries/Stepper/
 * 
 * Original library        (0.1)   by Tom Igoe.
 * Two-wire modifications  (0.2)   by Sebastian Gassner
 * Combination version     (0.3)   by Tom Igoe and David Mellis
 * Bug fix for four-wire   (0.4)   by Tom Igoe, bug fix from Noah Shibley
 * High-speed stepping mod         by Eugene Kozlenko
 * Timer rollover fix              by Eugene Kozlenko
 * Five phase five wire    (1.1.0) by Ryan Orendorff
 * 
 * NodeJS Implementation   (1.0.0) by Johan van der Meer
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 *
 *
 * Drives a unipolar, bipolar, or five phase stepper motor.
 *
 * When wiring multiple stepper motors to a microcontroller, you quickly run
 * out of output pins, with each motor requiring 4 connections.
 *
 * By making use of the fact that at any time two of the four motor coils are
 * the inverse of the other two, the number of control connections can be
 * reduced from 4 to 2 for the unipolar and bipolar motors.
 *
 * A slightly modified circuit around a Darlington transistor array or an
 * L293 H-bridge connects to only 2 microcontroller pins, inverts the signals
 * received, and delivers the 4 (2 plus 2 inverted ones) output signals
 * required for driving a stepper motor. Similarly the Arduino motor shield's
 * 2 direction pins may be used.
 *
 * The sequence of control signals for 5 phase, 5 control wires is as follows:
 *
 * Step C0 C1 C2 C3 C4
 *    1  0  1  1  0  1
 *    2  0  1  0  0  1
 *    3  0  1  0  1  1
 *    4  0  1  0  1  0
 *    5  1  1  0  1  0
 *    6  1  0  0  1  0
 *    7  1  0  1  1  0
 *    8  1  0  1  0  0
 *    9  1  0  1  0  1
 *   10  0  0  1  0  1
 *
 * The sequence of control signals for 4 control wires is as follows:
 *
 * Step C0 C1 C2 C3
 *    1  1  0  1  0
 *    2  0  1  1  0
 *    3  0  1  0  1
 *    4  1  0  0  1
 *
 * The sequence of control signals for 2 control wires is as follows
 * (columns C1 and C2 from above):
 *
 * Step C0 C1
 *    1  0  1
 *    2  1  1
 *    3  1  0
 *    4  0  0
 *
 * The circuits can be found at
 *
 * http://www.arduino.cc/en/Tutorial/Stepper
 * 
 * This library makes use of the 'onoff' library by fivdi to control the GPIO pins of the Raspberry Pi.
 * 
 * Onoff can be found at:           https://www.npmjs.com/package/onoff
 * Github repository:               https://github.com/fivdi/onoff 
 */


const Gpio = require('onoff').Gpio;
const HIGH = 1;
const LOW = 0;

module.exports = class Stepper
{

    /*
    *   constructor for four-pin version
    *   Sets which wires should control the motor.
    */
    constructor(in1, in2, in3, in4, number_of_steps)
    {
        this.in_1 = new Gpio(in1, 'out');
        this.in_2 = new Gpio(in2, 'out');
        this.in_3 = new Gpio(in3, 'out');
        this.in_4 = new Gpio(in4, 'out');

        this.step_number = 0;
        this.direction = 0;
        this.last_step_time = 0;
        this.number_of_steps = number_of_steps;

        this.pin_count = 4;
        console.log("Stepper initialized!")
    }

    /*
    * Sets the speed in revs per minute
    */
    setSpeed(speed)
    {
        // delay in ms
        this.step_delay = 60 * 1000 * 1000 / this.number_of_steps / speed;

        console.log("Setting speed to:", this.step_delay, "rpm.");
    }

    /*
    * Moves the motor steps_to_move steps.  If the number is negative,
    * the motor moves in the reverse direction.
    */
    step(steps_to_move)
    {
        console.log("Moving", steps_to_move, "steps.")
        // how many steps to take
        let steps_left = Math.abs(steps_to_move);

        // determine direction based on whether steps_to_mode is + or -:
        if (steps_to_move > 0) { this.direction = 1; }
        if (steps_to_move < 0) { this.direction = 0; }

        while (steps_left > 0)
        {
            let now = this.micros();

            // move only if the appropriate delay has passed:
            if (now - this.last_step_time >= this.step_delay)
            {
                // get the timeStamp of when you stepped:
                this.last_step_time = now;

                // increment or decrement the step number,
                // depending on direction:
                if (this.direction == 1)
                {
                    this.step_number++;
                    if (this.step_number == this.number_of_steps)
                    {
                        this.step_number = 0;
                    }
                }
                else
                {
                    if (this.step_number == 0)
                    {
                        this.step_number = this.number_of_steps;
                    }
                    this.step_number--;
                }

                // decrement the steps left:
                steps_left--;

                // step the motor to step number 0, 1, ..., {3 or 10}
                if (this.pin_count == 5)
                {
                    this.stepMotor(this.step_number % 10);
                }
                else
                {
                    this.stepMotor(this.step_number % 4);
                }
            }

        }
    }

    stepMotor(thisStep)
    {
        if (this.pin_count == 4)
        {
            switch (thisStep)
            {
                case 0:  // 1010
                    this.digitalWrite(this.in_1, HIGH);
                    this.digitalWrite(this.in_2, LOW);
                    this.digitalWrite(this.in_3, HIGH);
                    this.digitalWrite(this.in_4, LOW);
                    break;
                case 1:  // 0110
                    this.digitalWrite(this.in_1, LOW);
                    this.digitalWrite(this.in_2, HIGH);
                    this.digitalWrite(this.in_3, HIGH);
                    this.digitalWrite(this.in_4, LOW);
                    break;
                case 2:  //0101
                    this.digitalWrite(this.in_1, LOW);
                    this.digitalWrite(this.in_2, HIGH);
                    this.digitalWrite(this.in_3, LOW);
                    this.digitalWrite(this.in_4, HIGH);
                    break;
                case 3:  //1001
                    this.digitalWrite(this.in_1, HIGH);
                    this.digitalWrite(this.in_2, LOW);
                    this.digitalWrite(this.in_3, LOW);
                    this.digitalWrite(this.in_4, HIGH);
                    break;
            }
        }
    }

    digitalWrite(pin, value)
    {
        pin.writeSync(value);
    }

    micros()
    {
        return process.uptime() * 1000 * 1000;
    }
}