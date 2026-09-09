#!/bin/bash
# Usage: ./run_tests.sh [directory]
# If no directory is provided, the script will use the current directory.

# Set the directory to search.
DIR=${1:-.}

# Find all test files recursively (matching *.test.*)
for file in $(find "$DIR" -type f \( -name "*.test.*" -o -name "*.perf.*" \)); do
    # Get the directory of the test file
    test_dir=$(dirname "$file")
    # Get the test file's basename
    test_filename=$(basename "$file")
    # Create the log file path: same as test file but with .txt extension, in the same directory
    log_file="$test_dir/${test_filename%.*}.txt"
    if [[ "$file" == *.perf.* ]]; then
        test_command=(yarn test:perf "$file")
    else
        test_command=(yarn test "$file")
    fi
    echo "Running: ${test_command[*]}"
    echo "Logging output to: $log_file"
    # Run the test command with output redirection of both stdout and stderr.
    "${test_command[@]}" --verbose --json > "$log_file" 2>&1
    # Check if the npm test passed (exit code 0).
    if [ $? -eq 0 ]; then
        echo "Test passed for $file. Removing log file $log_file."
        rm "$log_file"
    else
        echo "Test failed for $file. Check $log_file for details."
    fi
done
