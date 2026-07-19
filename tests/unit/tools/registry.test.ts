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

  it('keeps the ebay_edelivery_* public naming contract for the eDelivery family', async () => {
    const names = getToolDefinitions().map((definition) => definition.name);
    const edeliveryNames = names.filter((name) => name.startsWith('ebay_edelivery_'));

    expect(edeliveryNames).toHaveLength(27);
    expect(names.filter((name) => name.startsWith('ebay_logistics_'))).toHaveLength(6);
    expect(names).toHaveLength(304);
    expect(
      names.filter((name) =>
        ['ebay_get_services', 'ebay_get_package', 'ebay_create_bundle'].includes(name),
      ),
    ).toEqual([]);

    const api = {
      edelivery: {
        getServices: vi.fn().mockReturnValue(Effect.succeed({ serviceList: { services: [] } })),
        getPackage: vi.fn().mockReturnValue(Effect.succeed({ packageInfo: {} })),
      },
    };

    await executeTool(api as never, 'ebay_edelivery_get_services', { limit: 10 });
    await executeTool(api as never, 'ebay_edelivery_get_package', { packageId: 'PKG123' });

    expect(api.edelivery.getServices).toHaveBeenCalledWith({ limit: 10 });
    expect(api.edelivery.getPackage).toHaveBeenCalledWith({ packageId: 'PKG123' });
  });

  it('advertises wire output contracts on every eDelivery tool that returns a body', () => {
    // 204 No Content operations plus createComplaint (unspecified bare-object
    // response) have no body shape to advertise, so they stay text-only.
    const withoutContract = [
      'ebay_edelivery_cancel_bundle',
      'ebay_edelivery_cancel_package',
      'ebay_edelivery_confirm_package',
      'ebay_edelivery_create_complaint',
      'ebay_edelivery_delete_package',
    ];
    const edeliveryEntries = getToolEntries().filter((entry) =>
      entry.definition.name.startsWith('ebay_edelivery_'),
    );

    expect(
      edeliveryEntries
        .filter((entry) => entry.wireOutputSchema === undefined)
        .map((entry) => entry.definition.name)
        .sort((left, right) => left.localeCompare(right)),
    ).toEqual(withoutContract);
    expect(edeliveryEntries.filter((entry) => entry.wireOutputSchema)).toHaveLength(22);
    expect(edeliveryEntries.some((entry) => entry.definition.outputSchema)).toBe(false);
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
