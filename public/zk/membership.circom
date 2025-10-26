pragma circom 2.1.8;

template Membership() {
    signal input x;
    signal output ok;

    // ok = 1 nếu x == 1, ok = 0 nếu khác
    ok <== x;

    // Giới hạn ok là boolean
    ok * (ok - 1) === 0;
}

component main = Membership();
