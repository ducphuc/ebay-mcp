import { describe, expect, it, vi } from 'vitest';
import {
  executeTool,
  getToolContracts,
  getToolDefinitions,
  getToolEntries,
  validateToolContracts,
  validateToolRegistry,
} from '@/tools/index.js';
import { Effect } from 'effect';

describe('tool registry', () => {
  it('keeps registered definitions unique and executable', () => {
    const validation = validateToolRegistry();
    const definitions = getToolDefinitions();
    const entries = getToolEntries();

    expect(validation.duplicateToolNames).toEqual([]);
    expect(validation.missingHandlers).toEqual([]);
    expect(entries).toHaveLength(definitions.length);
    expect(entries.map((entry) => entry.definition.name)).toEqual(
      definitions.map((definition) => definition.name),
    );
  });

  it('keeps tool contracts local to registered definitions', () => {
    const validation = validateToolContracts();
    const contracts = getToolContracts();

    expect(validation.duplicateContracts).toEqual([]);
    expect(validation.invalidInputSchemaFields).toEqual([]);
    expect(validation.malformedOutputSchemas).toEqual([]);
    expect(validation.missingDescriptions).toEqual([]);
    expect(validation.missingInputSchemas).toEqual([]);
    expect(contracts).toHaveLength(getToolDefinitions().length);
    expect(contracts.some((contract) => contract.outputSchema)).toBe(true);
  });

  it('executes public handlers added by the registry instead of falling through', async () => {
    const api = {
      feedback: {
        getFeedbackRatingSummary: vi.fn().mockReturnValue(Effect.succeed({ positive: 1 })),
      },
    };

    await executeTool(api as never, 'ebay_get_feedback_rating_summary', {
      userId: 'seller',
      filter: 'ratingType:ALL',
    });

    expect(api.feedback.getFeedbackRatingSummary).toHaveBeenCalledOnce();
  });

  it('returns the current unknown-tool error', async () => {
    await expect(executeTool({} as never, 'unknown_tool', {})).rejects.toThrow(
      'Unknown tool: unknown_tool',
    );
  });

  it('registers all nine Media and Logistics port tools with executable handlers', () => {
    const expectedNames = [
      'ebay_media_create_image_from_file',
      'ebay_media_create_image_from_url',
      'ebay_media_get_image',
      'ebay_logistics_create_shipping_quote',
      'ebay_logistics_get_shipping_quote',
      'ebay_logistics_create_from_shipping_quote',
      'ebay_logistics_get_shipment',
      'ebay_logistics_cancel_shipment',
      'ebay_logistics_download_label_file',
    ];
    const entries = getToolEntries();
    const portEntries = entries.filter((entry) => expectedNames.includes(entry.definition.name));

    expect(portEntries.map((entry) => entry.definition.name).sort()).toEqual(expectedNames.sort());
    expect(portEntries.every((entry) => typeof entry.handler === 'function')).toBe(true);
    expect(
      portEntries
        .filter((entry) => entry.wireOutputSchema)
        .map((entry) => entry.definition.name)
        .sort(),
    ).toEqual(
      [
        'ebay_media_create_image_from_file',
        'ebay_media_create_image_from_url',
        'ebay_media_get_image',
        'ebay_logistics_download_label_file',
      ].sort(),
    );
  });
});
