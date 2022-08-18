#!/bin/bash -ve

# MAKE SURE TO:   /proc/sys/net/ipv4# echo 0 > tcp_tw_reuse


snapshot() {
    mkdir -p results/energy-01/$1
    cp -v /sys/class/power_supply/BAT0/{capacity,capacity_level,charge_full,charge_full_design,charge_now,current_now,voltage_now,voltage_min_design} results/energy-01/$1/
    date > results/energy-01/$1/date.txt
    acpi --everything > results/energy-01/$1/acpi.txt
    dbus-send --print-reply --system --dest=org.freedesktop.UPower /org/freedesktop/UPower/devices/battery_BAT0 org.freedesktop.UPower.Device.Refresh
    upower -i /org/freedesktop/UPower/devices/battery_BAT0 > results/energy-01/$1/upower.txt

    touch results/energy-01/log.txt
    echo $1 >> results/energy-01/log.txt
    upower -i /org/freedesktop/UPower/devices/battery_BAT0 | grep "updated:" >> results/energy-01/log.txt
    upower -i /org/freedesktop/UPower/devices/battery_BAT0 | grep "energy:" >> results/energy-01/log.txt
}


./node_modules/.bin/yarn build
rm -rfv results/energy-01


snapshot "01_start"

# sleep 600;
sleep 10;

snapshot "02_waited"

# TRIALS=10 TREE_DEGREE=75 BATCH_SIZE=50 CHAIN_SIZE=3650 SUPERLIGHT=true node dist/benchmark/multiple-prover-optimal-params.js
# TRIALS=1 TREE_DEGREE=75 BATCH_SIZE=50 CHAIN_SIZE=3650 SUPERLIGHT=true node dist/benchmark/multiple-prover-optimal-params.js
TRIALS=1 TREE_DEGREE=75 BATCH_SIZE=50 CHAIN_SIZE=3650 SUPERLIGHT=true node dist/benchmark/energypower-test.js

snapshot "03_slced"

# TRIALS=10 TREE_DEGREE=75 BATCH_SIZE=50 CHAIN_SIZE=3650 SUPERLIGHT=false node dist/benchmark/multiple-prover-optimal-params.js
# TRIALS=1 TREE_DEGREE=75 BATCH_SIZE=50 CHAIN_SIZE=3650 SUPERLIGHT=false node dist/benchmark/multiple-prover-optimal-params.js
TRIALS=1 TREE_DEGREE=75 BATCH_SIZE=50 CHAIN_SIZE=3650 SUPERLIGHT=false node dist/benchmark/energypower-test.js

snapshot "04_lced"

# sleep 600;
sleep 10;

snapshot "05_done"
