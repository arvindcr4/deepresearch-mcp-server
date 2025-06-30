# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

-   **`atlas_deep_research` Tool**: Introduced a new MCP tool (`atlas_deep_research`) designed to initiate and structure deep research processes within the Atlas knowledge base. This tool allows users to define a primary research topic, goal, and scope, and break it down into manageable sub-topics with initial search queries. It creates a hierarchical knowledge graph in Neo4j, consisting of a root 'research-plan' node and child 'research-subtopic' nodes, facilitating organized research efforts. The tool supports client-provided IDs, domain categorization, initial tagging, and flexible response formatting (formatted string or raw JSON). Core logic resides in `src/mcp/tools/atlas_deep_research/deepResearch.ts`, with input validation using Zod schemas in `types.ts` and response formatting handled in `responseFormat.ts`. An example demonstrating its usage and output can be found in the [`examples/deep-research-example/`](./examples/deep-research-example/) directory.
