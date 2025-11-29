/**
 * Prompt Template System for LLM Summarization
 * Provides structured prompts for different summarization tasks using graph data
 */

import { Graph, GraphNode } from '../../models/graph.model';

export type SummaryType =
  | 'executive' // High-level overview for executives
  | 'detailed' // Comprehensive summary with all key points
  | 'chapter' // Summary organized by document sections
  | 'bullet-points' // Key takeaways as bullet points
  | 'narrative' // Story-like summary flowing through the document
  | 'technical'; // Technical details for experts

export interface SummaryRequest {
  type: SummaryType;
  graph: Graph;
  contextOverride?: string; // Optional precomputed context string
  maxLength?: number; // Maximum length in words
  focus?: string[]; // Specific topics to focus on
  exclude?: string[]; // Topics to exclude
  style?: 'formal' | 'casual' | 'technical';
}

export interface PromptTemplate {
  systemPrompt: string;
  userPrompt: string;
  context: string;
  instructions: string[];
}

export class PromptTemplateService {
  /**
   * Generate a complete prompt for summarization based on request
   */
  public generatePrompt(request: SummaryRequest): PromptTemplate {
    const {
      type,
      graph,
      contextOverride,
      maxLength,
      focus,
      exclude,
      style = 'formal',
    } = request;

    // Get relevant nodes for summarization
    const summaryNodes = this.getRelevantNodes(graph, type);

    // Generate context from graph
    const context =
      contextOverride !== undefined
        ? contextOverride
        : this.generateContext(graph, summaryNodes);

    // Generate type-specific prompt
    const template = this.getTemplateForType(type, style);

    // Customize prompts with parameters
    const systemPrompt = this.customizeSystemPrompt(template.systemPrompt, {
      maxLength,
      focus,
      exclude,
      style,
    });

    const userPrompt = this.customizeUserPrompt(template.userPrompt, {
      context,
      type,
      maxLength,
    });

    return {
      systemPrompt,
      userPrompt,
      context,
      instructions: template.instructions,
    };
  }

  /**
   * Get nodes relevant for summarization based on type
   */
  private getRelevantNodes(graph: Graph, type: SummaryType): GraphNode[] {
    const nodes = graph.nodes;

    switch (type) {
      case 'executive':
        // Focus on high-level sections and key paragraphs
        return nodes.filter(
          (node) =>
            node.type === 'section' ||
            (node.type === 'paragraph' && this.isKeyParagraph(node))
        );

      case 'detailed':
        // Include all content nodes
        return nodes.filter((node) =>
          ['section', 'paragraph', 'table', 'list'].includes(node.type)
        );

      case 'chapter':
        // Organize by sections
        return nodes.filter(
          (node) => node.type === 'section' || node.type === 'paragraph'
        );

      case 'bullet-points':
        // Key points from all content
        return nodes.filter((node) =>
          ['section', 'paragraph', 'list'].includes(node.type)
        );

      case 'narrative':
        // Sequential content for story flow
        return nodes
          .filter((node) => ['section', 'paragraph'].includes(node.type))
          .sort((a, b) => a.position.start - b.position.start);

      case 'technical':
        // Technical content including code and tables
        return nodes.filter((node) =>
          ['section', 'paragraph', 'table', 'code', 'list'].includes(node.type)
        );

      default:
        return nodes.filter((node) => node.type === 'paragraph');
    }
  }

  /**
   * Check if a paragraph is a key paragraph (contains important information)
   */
  private isKeyParagraph(node: GraphNode): boolean {
    const content = node.content.toLowerCase();

    // Keywords that indicate important content
    const keyIndicators = [
      'summary',
      'conclusion',
      'introduction',
      'overview',
      'key',
      'important',
      'main',
      'primary',
      'significant',
      'recommendation',
      'finding',
      'result',
      'outcome',
    ];

    return (
      keyIndicators.some((indicator) => content.includes(indicator)) ||
      content.length > 200
    ); // Longer paragraphs likely contain more info
  }

  /**
   * Generate context string from relevant nodes
   */
  private generateContext(graph: Graph, nodes: GraphNode[]): string {
    const sections = new Map<string, GraphNode[]>();
    const paragraphs: string[] = [];

    // Group nodes by sections
    for (const node of nodes) {
      if (node.type === 'section') {
        sections.set(node.id, [node]);
      }
    }

    // Add paragraphs to their sections
    for (const node of nodes) {
      if (node.type === 'paragraph') {
        const parentSection = this.findParentSection(graph, node.id);
        if (parentSection && sections.has(parentSection.id)) {
          sections.get(parentSection.id)!.push(node);
        } else {
          // Orphaned paragraph
          paragraphs.push(node.content);
        }
      }
    }

    // Build context string
    const contextParts: string[] = [];

    for (const [, sectionNodes] of sections) {
      const sectionNode = sectionNodes[0];
      contextParts.push(`## ${sectionNode.label}\n`);
      contextParts.push(`${sectionNode.content}\n`);

      for (let i = 1; i < sectionNodes.length; i++) {
        const paragraphNode = sectionNodes[i];
        contextParts.push(`${paragraphNode.content}\n`);
      }
    }

    // Add orphaned paragraphs
    if (paragraphs.length > 0) {
      contextParts.push('## Additional Content\n');
      contextParts.push(paragraphs.join('\n\n'));
    }

    return contextParts.join('\n');
  }

  /**
   * Find parent section for a node
   */
  private findParentSection(graph: Graph, nodeId: string): GraphNode | null {
    const parentEdges = graph.edges.filter(
      (edge) => edge.target === nodeId && edge.type === 'contains'
    );

    if (parentEdges.length === 0) return null;

    const parentNode = graph.nodes.find(
      (node) => node.id === parentEdges[0].source && node.type === 'section'
    );

    return parentNode || null;
  }

  /**
   * Get template for summary type
   */
  private getTemplateForType(
    type: SummaryType,
    style: string
  ): Omit<PromptTemplate, 'context'> {
    const styleInstructions = this.getStyleInstructions(style);

    switch (type) {
      case 'executive':
        return {
          systemPrompt: `You are an expert at creating executive summaries. ${styleInstructions}`,
          userPrompt: `Create a concise executive summary of the following document content. Focus on the most important information that executives need to know. Keep it under {maxLength} words.

Document Content:
{context}

Summary:`,
          instructions: [
            'Identify the main topic and purpose',
            'Highlight key findings or conclusions',
            'Include important metrics or data points',
            'Focus on implications and recommendations',
            'Keep it concise and actionable',
          ],
        };

      case 'detailed':
        return {
          systemPrompt: `You are an expert at creating comprehensive summaries. ${styleInstructions}`,
          userPrompt: `Create a detailed summary of the following document, covering all important aspects and maintaining the document's structure and key information.

Document Content:
{context}

Detailed Summary:`,
          instructions: [
            'Cover all major sections and topics',
            'Preserve important details and data',
            'Maintain logical flow and relationships',
            'Include supporting evidence for key points',
            'Ensure completeness without unnecessary repetition',
          ],
        };

      case 'chapter':
        return {
          systemPrompt: `You are an expert at organizing information by chapters/sections. ${styleInstructions}`,
          userPrompt: `Summarize the following document by organizing it into clear chapters or sections, with each section summarizing the corresponding part of the document.

Document Content:
{context}

Chapter-by-Chapter Summary:`,
          instructions: [
            'Identify main sections/chapters',
            'Create clear headings for each section',
            'Summarize each section comprehensively',
            "Maintain the document's logical structure",
            'Ensure smooth transitions between sections',
          ],
        };

      case 'bullet-points':
        return {
          systemPrompt: `You are an expert at extracting key information into bullet points. ${styleInstructions}`,
          userPrompt: `Extract the most important information from the following document and present it as clear, actionable bullet points.

Document Content:
{context}

Key Takeaways:`,
          instructions: [
            'Identify the most important information',
            'Use clear, concise bullet points',
            'Organize logically (by topic or importance)',
            'Include specific data points and facts',
            'Focus on actionable insights',
          ],
        };

      case 'narrative':
        return {
          systemPrompt: `You are an expert at creating narrative summaries that tell a story. ${styleInstructions}`,
          userPrompt: `Create a narrative summary that flows through the document like a story, connecting the different parts logically and maintaining the document's progression.

Document Content:
{context}

Narrative Summary:`,
          instructions: [
            'Create a flowing, story-like summary',
            'Connect different sections logically',
            'Maintain chronological or logical progression',
            'Use transitions to link ideas',
            'Make it engaging and easy to follow',
          ],
        };

      case 'technical':
        return {
          systemPrompt: `You are an expert at creating technical summaries. ${styleInstructions}`,
          userPrompt: `Create a technical summary that preserves technical details, methodologies, and precise information from the document.

Document Content:
{context}

Technical Summary:`,
          instructions: [
            'Preserve technical terminology and concepts',
            'Include specific methodologies and processes',
            'Maintain accuracy of technical details',
            'Include data, specifications, and measurements',
            'Focus on technical implications and applications',
          ],
        };

      default:
        return {
          systemPrompt: `You are an expert at creating summaries. ${styleInstructions}`,
          userPrompt: `Summarize the following document content:

Document Content:
{context}

Summary:`,
          instructions: [
            'Identify the main points',
            'Be concise yet comprehensive',
            'Maintain accuracy',
            'Focus on important information',
          ],
        };
    }
  }

  /**
   * Get style-specific instructions
   */
  private getStyleInstructions(style: string): string {
    switch (style) {
      case 'formal':
        return 'Use formal, professional language appropriate for business or academic contexts.';
      case 'casual':
        return "Use conversational, accessible language that's easy to understand.";
      case 'technical':
        return 'Use precise technical language and maintain technical accuracy.';
      default:
        return 'Use clear, professional language.';
    }
  }

  /**
   * Customize system prompt with parameters
   */
  private customizeSystemPrompt(
    template: string,
    params: {
      maxLength?: number;
      focus?: string[];
      exclude?: string[];
      style: string;
    }
  ): string {
    let prompt = template;

    if (params.maxLength) {
      prompt += ` Limit the summary to approximately ${params.maxLength} words.`;
    }

    if (params.focus && params.focus.length > 0) {
      prompt += ` Focus particularly on: ${params.focus.join(', ')}.`;
    }

    if (params.exclude && params.exclude.length > 0) {
      prompt += ` Avoid focusing on: ${params.exclude.join(', ')}.`;
    }

    return prompt;
  }

  /**
   * Customize user prompt with parameters
   */
  private customizeUserPrompt(
    template: string,
    params: {
      context: string;
      type: SummaryType;
      maxLength?: number;
    }
  ): string {
    let prompt = template;

    // Replace placeholders
    prompt = prompt.replace('{context}', params.context);
    prompt = prompt.replace(
      '{maxLength}',
      params.maxLength?.toString() || '500'
    );

    return prompt;
  }

  /**
   * Estimate token count for a prompt
   */
  public estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Get supported summary types
   */
  public getSupportedTypes(): SummaryType[] {
    return [
      'executive',
      'detailed',
      'chapter',
      'bullet-points',
      'narrative',
      'technical',
    ];
  }
}

// Export singleton instance
export const promptTemplateService = new PromptTemplateService();
