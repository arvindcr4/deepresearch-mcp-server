import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';
import { createToolExample, createToolMetadata, registerTool } from '../../../types/tool.js';
import { atlasAddKnowledge } from './addKnowledge.js';
import { AtlasKnowledgeAddSchemaShape } from './types.js';

export const registerAtlasKnowledgeAddTool = (server: McpServer) => {
  registerTool(
    server,
    "atlas_knowledge_add",
    "Adds a new knowledge item or multiple items to the system with domain categorization, tagging, and citation support",
    AtlasKnowledgeAddSchemaShape,
    atlasAddKnowledge,
    createToolMetadata({
      examples: [
        createToolExample(
          {
            mode: "single",
            projectId: "proj_ms_migration",
            text: "GraphQL provides significant performance benefits over REST when clients need to request multiple related resources. By allowing clients to specify exactly what data they need in a single request, GraphQL eliminates over-fetching and under-fetching problems common in REST APIs.",
            domain: "technical",
            tags: ["graphql", "api", "performance", "rest"],
            citations: ["https://graphql.org/learn/best-practices/", "https://www.apollographql.com/blog/graphql/basics/graphql-vs-rest/"]
          },
          `{
            "id": "know_graphql_benefits",
            "projectId": "proj_ms_migration",
            "text": "GraphQL provides significant performance benefits over REST when clients need to request multiple related resources. By allowing clients to specify exactly what data they need in a single request, GraphQL eliminates over-fetching and under-fetching problems common in REST APIs.",
            "tags": ["graphql", "api", "performance", "rest"],
            "domain": "technical",
            "citations": ["https://graphql.org/learn/best-practices/", "https://www.apollographql.com/blog/graphql/basics/graphql-vs-rest/"],
            "createdAt": "2025-03-23T10:11:24.123Z",
            "updatedAt": "2025-03-23T10:11:24.123Z"
          }`,
          "Add technical knowledge about GraphQL benefits with citations and tags"
        ),
        createToolExample(
          {
            mode: "bulk",
            knowledge: [
              {
                projectId: "proj_ui_redesign",
                text: "User interviews revealed that 78% of our customers struggle with the current checkout flow, particularly the address entry form which was described as 'confusing' and 'overly complex'.",
                domain: "business",
                tags: ["user-research", "checkout", "ux-issues"]
              },
              {
                projectId: "proj_ui_redesign",
                text: "Industry research shows that automatically formatting phone numbers and credit card fields as users type reduces error rates by approximately 25%. Implementing real-time validation with clear error messages has been shown to decrease form abandonment rates by up to 40%.",
                domain: "technical",
                tags: ["form-design", "validation", "ux-patterns"],
                citations: ["https://baymard.com/blog/input-mask-form-fields", "https://www.smashingmagazine.com/2020/03/form-validation-ux-design/"]
              }
            ]
          },
          `{
            "success": true,
            "message": "Successfully added 2 knowledge items",
            "created": [
              {
                "id": "know_checkout_research",
                "projectId": "proj_ui_redesign",
                "text": "User interviews revealed that 78% of our customers struggle with the current checkout flow, particularly the address entry form which was described as 'confusing' and 'overly complex'.",
                "tags": ["user-research", "checkout", "ux-issues"],
                "domain": "business",
                "citations": [],
                "createdAt": "2025-03-23T10:11:24.123Z",
                "updatedAt": "2025-03-23T10:11:24.123Z"
              },
              {
                "id": "know_form_validation",
                "projectId": "proj_ui_redesign",
                "text": "Industry research shows that automatically formatting phone numbers and credit card fields as users type reduces error rates by approximately 25%. Implementing real-time validation with clear error messages has been shown to decrease form abandonment rates by up to 40%.",
                "tags": ["form-design", "validation", "ux-patterns"],
                "domain": "technical",
                "citations": ["https://baymard.com/blog/input-mask-form-fields", "https://www.smashingmagazine.com/2020/03/form-validation-ux-design/"],
                "createdAt": "2025-03-23T10:11:24.456Z",
                "updatedAt": "2025-03-23T10:11:24.456Z"
              }
            ],
            "errors": []
          }`,
          "Add multiple knowledge items with mixed domains and research findings"
        )
      ],
      requiredPermission: "knowledge:create",
      returnSchema: z.union([
        // Single knowledge response
        z.object({
          id: z.string().describe("Knowledge ID"),
          projectId: z.string().describe("Project ID"),
          text: z.string().describe("Knowledge content"),
          tags: z.array(z.string()).describe("Categorical labels"),
          domain: z.string().describe("Knowledge domain"),
          citations: z.array(z.string()).describe("Reference sources"),
          createdAt: z.string().describe("Creation timestamp"),
          updatedAt: z.string().describe("Last update timestamp")
        }),
        // Bulk creation response
        z.object({
          success: z.boolean().describe("Operation success status"),
          message: z.string().describe("Result message"),
          created: z.array(z.object({
            id: z.string().describe("Knowledge ID"),
            projectId: z.string().describe("Project ID"),
            text: z.string().describe("Knowledge content"),
            tags: z.array(z.string()).describe("Categorical labels"),
            domain: z.string().describe("Knowledge domain"),
            citations: z.array(z.string()).describe("Reference sources"),
            createdAt: z.string().describe("Creation timestamp"),
            updatedAt: z.string().describe("Last update timestamp")
          })).describe("Created knowledge items"),
          errors: z.array(z.object({
            index: z.number().describe("Index in the knowledge array"),
            knowledge: z.any().describe("Original knowledge data"),
            error: z.object({
              code: z.string().describe("Error code"),
              message: z.string().describe("Error message"),
              details: z.any().optional().describe("Additional error details")
            }).describe("Error information")
          })).describe("Creation errors")
        })
      ]),
      rateLimit: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 20 // 20 requests per minute (higher than project creation as knowledge items are typically smaller)
      }
    })
  );
};
