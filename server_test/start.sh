#!/bin/bash

# Check if parameters are provided
if [ "$#" -ne 4 ] || ! [[ "$1" =~ ^[0-9]+$ ]]; then
    echo "Usage: $0 <max_users> <hostname> <port> <experimentId>"
    exit 1
fi

# Determine the number of CPU cores based on the operating system
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    num_cores=$(nproc)
elif [[ "$OSTYPE" == "darwin"* ]]; then
    num_cores=$(sysctl -n hw.ncpu)
else
    echo "Unsupported OS: $OSTYPE"
    exit 1
fi

# Parameters
max_users=$1
hostname=$2
port=$3
experimentId=$4

# Calculate base number of users per process
users_per_core=$((max_users / num_cores))
remainder=$((max_users % num_cores))

# Function to handle users using a Node.js script
handle_users() {
    local process_id=$1
    local start_user_id=$2
    local users=$3
    node test_user_flow.js -s $start_user_id -n $users -hn $hostname -p $port -e $experimentId
}

# Launch processes, distributing the users
start_user_id=1
for i in $(seq 1 $num_cores); do
    if [ $i -le $remainder ]; then
        users_for_this_core=$((users_per_core + 1))
    else
        users_for_this_core=$users_per_core
    fi
    handle_users $i $start_user_id $users_for_this_core &
    start_user_id=$((start_user_id + users_for_this_core))
done

wait

