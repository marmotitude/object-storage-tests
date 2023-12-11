#!/usr/bin/env python3
import sys
import json
import yaml
from typing import Dict, List, TypedDict

# Check if the correct number of command line arguments is provided
if len(sys.argv) != 3:
    print("Usage: ./tag-report.py results.json 'remote1 remote2 remote3' > results.yaml")
    sys.exit(1)

input_file = sys.argv[1]
remotes_argument = sys.argv[2].split()

# Define types for the yaml output structure
RemoteName = str
SuccessCount = int
TotalChecks = int
TagName = str
tool = str
feature = str
check = dict
value = int

class RemoteSuccessCount(TypedDict):
    success: SuccessCount
    total: TotalChecks

TagSummary = Dict[TagName, Dict[RemoteName, RemoteSuccessCount]]
checks_data: Dict[str, Dict[str, Dict[str, str]]] = {}

class TestPeriod(TypedDict):
    begin: str
    end: str

class ProcessedData(TypedDict):
    period: TestPeriod
    remotes: List[RemoteName]
    section_titles: List[str]
    tags_order: List[TagName]
    tags: TagSummary

# Read k6 JSON output file line by line
tag_counts: Dict[TagName, TagSummary] = {}
oldest_check_time = None
most_recent_check_time = None

try:
    with open(input_file, 'r') as file:
        for line in file:
            try:
                entry = json.loads(line)
                if 'data' in entry and 'tags' in entry['data'] and entry['metric'] == "checks":
                    check_time = entry['data']['time']
                    if oldest_check_time is None or check_time < oldest_check_time:
                        oldest_check_time = check_time
                    if most_recent_check_time is None or check_time > most_recent_check_time:
                        most_recent_check_time = check_time
                    #print(entry)
                    tags = entry['data']['tags']
                    #print(tags)
                    remote = tags.get('remote', None)
                    value = entry['data']['value']
                    feature = tags.get('feature')
                    tool = tags.get('tool', None)
                    if tool and feature:
                        checks_data.setdefault(remote, {}).setdefault(tool, {}).update({
                                feature: value
                            })
                    else:
                        continue
                    for tag, tag_value in tags.items():
                        if tag == 'remote':
                            continue
                        tag_counts.setdefault(tag, {}).setdefault(tag_value, {}).setdefault(remote, {'success': 0, 'total': 0})
                        tag_counts[tag][tag_value][remote]['total'] += 1
                        if value == 1:
                            tag_counts[tag][tag_value][remote]['success'] += 1
            except json.JSONDecodeError:
                print(f"Skipping invalid JSON: {line}")
except FileNotFoundError:
    print(f"Error: File '{input_file}' not found.")
    sys.exit(1)

# Determine the order of remotes based on the second argument
remotes_order = remotes_argument

# Output processed data and remotes as YAML to stdout
tags_order = ["feature", "tool", "command", "fix", "checks"]
section_titles = ["Features", "Tools", "Commands", "Fixes", "checks"]

processed_data: ProcessedData = {
    'period': {
      'begin': oldest_check_time,
      'end': most_recent_check_time,
    },
    'remotes': remotes_order,
    'section_titles': section_titles,
    'tags_order': tags_order,
    'tags': {
        tag: tag_counts.get(tag) if tag != "checks" else checks_data for tag in tags_order
    },
}

try:
    yaml.dump(processed_data, sys.stdout, default_flow_style=False)
except IOError:
    print('Error: Unable to write YAML data to stdout')

