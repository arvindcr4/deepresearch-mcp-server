# deepresearch-mcp-server - Directory Structure

Generated on: 2025-06-30 04:50:00


```
deepresearch-mcp-server
├── docs
    └── tree.md
├── examples
    ├── backup-example
    │   ├── knowledges.json
    │   ├── projects.json
    │   ├── relationships.json
    │   └── tasks.json
    ├── deep-research-example
    │   ├── covington_community_grant_research.md
    │   └── full-export.json
    └── README.md
├── scripts
    ├── build.js
    ├── clean.ts
    ├── db-backup.ts
    ├── db-import.ts
    ├── dev.js
    ├── make-executable.ts
    └── tree.ts
├── src
    ├── cli
    │   └── index.ts
    ├── config
    │   └── index.ts
    ├── mcp
    │   ├── resources
    │   │   ├── knowledge
    │   │   │   └── knowledgeResources.ts
    │   │   ├── projects
    │   │   │   └── projectResources.ts
    │   │   ├── tasks
    │   │   │   └── taskResources.ts
    │   │   ├── index.ts
    │   │   └── types.ts
    │   ├── tools
    │   │   ├── atlas_database_clean
    │   │   │   ├── cleanDatabase.ts
    │   │   │   ├── index.ts
    │   │   │   ├── responseFormat.ts
    │   │   │   └── types.ts
    │   │   ├── atlas_deep_research
    │   │   │   ├── deepResearch.ts
    │   │   │   ├── index.ts
    │   │   │   ├── responseFormat.ts
    │   │   │   └── types.ts
    │   │   ├── atlas_knowledge_add
    │   │   │   ├── addKnowledge.ts
    │   │   │   ├── index.ts
    │   │   │   ├── responseFormat.ts
    │   │   │   └── types.ts
    │   │   ├── atlas_knowledge_delete
    │   │   │   ├── deleteKnowledge.ts
    │   │   │   ├── index.ts
    │   │   │   ├── responseFormat.ts
    │   │   │   └── types.ts
    │   │   ├── atlas_knowledge_list
    │   │   │   ├── index.ts
    │   │   │   ├── listKnowledge.ts
    │   │   │   ├── responseFormat.ts
    │   │   │   └── types.ts
    │   │   ├── atlas_project_create
    │   │   │   ├── createProject.ts
    │   │   │   ├── index.ts
    │   │   │   ├── responseFormat.ts
    │   │   │   └── types.ts
    │   │   ├── atlas_project_delete
    │   │   │   ├── deleteProject.ts
    │   │   │   ├── index.ts
    │   │   │   ├── responseFormat.ts
    │   │   │   └── types.ts
    │   │   ├── atlas_project_list
    │   │   │   ├── index.ts
    │   │   │   ├── listProjects.ts
    │   │   │   ├── responseFormat.ts
    │   │   │   └── types.ts
    │   │   ├── atlas_project_update
    │   │   │   ├── index.ts
    │   │   │   ├── responseFormat.ts
    │   │   │   ├── types.ts
    │   │   │   └── updateProject.ts
    │   │   ├── atlas_task_create
    │   │   │   ├── createTask.ts
    │   │   │   ├── index.ts
    │   │   │   ├── responseFormat.ts
    │   │   │   └── types.ts
    │   │   ├── atlas_task_delete
    │   │   │   ├── deleteTask.ts
    │   │   │   ├── index.ts
    │   │   │   ├── responseFormat.ts
    │   │   │   └── types.ts
    │   │   ├── atlas_task_list
    │   │   │   ├── index.ts
    │   │   │   ├── listTasks.ts
    │   │   │   ├── responseFormat.ts
    │   │   │   └── types.ts
    │   │   ├── atlas_task_update
    │   │   │   ├── index.ts
    │   │   │   ├── responseFormat.ts
    │   │   │   ├── types.ts
    │   │   │   └── updateTask.ts
    │   │   ├── atlas_unified_search
    │   │   │   ├── index.ts
    │   │   │   ├── responseFormat.ts
    │   │   │   ├── types.ts
    │   │   │   └── unifiedSearch.ts
    │   │   ├── grok3.ts
    │   │   ├── openai-deep-research.ts
    │   │   └── perplexity-sonar.ts
    │   ├── router.ts
    │   └── server.ts
    ├── middleware
    │   ├── rateLimiter.ts
    │   └── validation.ts
    ├── providers
    │   ├── agentspace.ts
    │   ├── firecrawl.ts
    │   ├── grok.ts
    │   ├── index.ts
    │   ├── openai.ts
    │   └── perplexity.ts
    ├── schemas
    │   └── deepResearch.ts
    ├── services
    │   └── neo4j
    │   │   ├── backupRestoreService.ts
    │   │   ├── driver.ts
    │   │   ├── events.ts
    │   │   ├── helpers.ts
    │   │   ├── index.ts
    │   │   ├── knowledgeService.ts
    │   │   ├── projectService.ts
    │   │   ├── searchService.ts
    │   │   ├── taskService.ts
    │   │   ├── types.ts
    │   │   └── utils.ts
    ├── types
    │   ├── errors.ts
    │   ├── mcp.ts
    │   └── tool.ts
    ├── utils
    │   ├── errorHandler.ts
    │   ├── errors.ts
    │   ├── idGenerator.ts
    │   ├── logger.ts
    │   ├── responseFormatter.ts
    │   └── security.ts
    └── index.ts
├── .clinerules
├── .repomixignore
├── CHANGELOG.md
├── CONFIG.md
├── docker-compose.yml
├── LICENSE
├── package-lock.json
├── package.json
├── README.md
├── repomix.config.json
├── test-server.js
└── tsconfig.json

```

_Note: This tree excludes files and directories matched by .gitignore and common patterns like node_modules._
