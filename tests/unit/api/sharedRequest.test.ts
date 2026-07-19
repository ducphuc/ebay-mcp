import { describe, expect, it, vi } from 'vitest';
import { Effect } from 'effect';
import {
  buildEndpointParams,
  EbayApiError,
  optionalNonNegativeNumberEffect,
  optionalPositiveNumberEffect,
  optionalStringEffect,
  requestGetEffect,
  requireObjectEffect,
  requireStringEffect,
} from '@/api/shared/request.js';
import type { EbayApiClient } from '@/api/client.js';
import { clientRequestError } from '@/api/clientRequestError.js';
import { HttpError } from '@/utils/http.js';

describe('shared API request helpers', () => {
  it('builds endpoint-owned query params and omits empty values', () => {
    expect(
      buildEndpointParams({
        policyTypes: { wireName: 'policy_types', value: 'TAKE_BACK' },
        missing: { wireName: 'missing', value: undefined },
        empty: { wireName: 'empty', value: '' },
      }),
    ).toEqual({ policy_types: 'TAKE_BACK' });

    expect(
      buildEndpointParams({
        missing: { wireName: 'missing', value: undefined },
        empty: { wireName: 'empty', value: '' },
      }),
    ).toBeUndefined();
  });

  it('validates required endpoint values as typed Effects', async () => {
    const stringError = await Effect.runPromise(Effect.flip(requireStringEffect('', 'sku')));
    const objectError = await Effect.runPromise(Effect.flip(requireObjectEffect(null, 'body')));

    expect(stringError).toMatchObject({
      _tag: 'EndpointInputError',
      parameter: 'sku',
    });
    expect(objectError).toMatchObject({
      _tag: 'EndpointInputError',
      parameter: 'body',
    });
  });

  it('validates optional query values as typed Effects', async () => {
    await expect(Effect.runPromise(optionalStringEffect(undefined, 'filter'))).resolves.toBe(
      undefined,
    );
    await expect(Effect.runPromise(optionalPositiveNumberEffect(50, 'limit'))).resolves.toBe(50);
    await expect(Effect.runPromise(optionalNonNegativeNumberEffect(0, 'offset'))).resolves.toBe(0);

    const stringError = await Effect.runPromise(Effect.flip(optionalStringEffect(1, 'filter')));
    const limitError = await Effect.runPromise(
      Effect.flip(optionalPositiveNumberEffect(0, 'limit')),
    );
    const offsetError = await Effect.runPromise(
      Effect.flip(optionalNonNegativeNumberEffect(-1, 'offset')),
    );

    expect(stringError).toMatchObject({
      _tag: 'EndpointInputError',
      parameter: 'filter',
    });
    expect(limitError).toMatchObject({
      _tag: 'EndpointInputError',
      parameter: 'limit',
    });
    expect(offsetError).toMatchObject({
      _tag: 'EndpointInputError',
      parameter: 'offset',
    });
  });

  it('runs GET requests through Effect with typed eBay API failures', async () => {
    const client = {
      get: vi.fn().mockRejectedValue(new Error('network down')),
    } as unknown as EbayApiClient;

    const failure = await Effect.runPromiseExit(
      requestGetEffect(client, '/sell/account/v1/custom_policy', { policy_types: 'TAKE_BACK' }),
    );

    expect(client.get).toHaveBeenCalledWith('/sell/account/v1/custom_policy', {
      policy_types: 'TAKE_BACK',
    });
    expect(failure._tag).toBe('Failure');
    if (failure._tag === 'Failure') {
      const error = failure.cause._tag === 'Fail' ? failure.cause.error : undefined;
      expect(error).toBeInstanceOf(EbayApiError);
      expect(error).toMatchObject({
        _tag: 'EbayApiError',
        method: 'GET',
        path: '/sell/account/v1/custom_policy',
        message: 'network down',
      });
    }
  });

  it('recovers eBay error detail through the client Promise boundary', async () => {
    const path = '/sell/inventory/v1/inventory_item/MISSING-SKU';
    const ebayErrorBody = {
      errors: [
        {
          errorId: 25710,
          domain: 'API_INVENTORY',
          category: 'REQUEST',
          message: 'Resource not found.',
          longMessage: 'The SKU value MISSING-SKU was not found.',
        },
      ],
    };
    // Mirror the real client verbs: the internal Effect failure is collapsed
    // into a Promise rejection (FiberFailure) by Effect.runPromise.
    const client = {
      get: vi.fn(() =>
        Effect.runPromise(
          Effect.fail(
            clientRequestError({
              kind: 'httpStatus',
              method: 'GET',
              url: `https://api.ebay.com${path}`,
              message: 'eBay API Error: The SKU value MISSING-SKU was not found.',
              status: 404,
              cause: new HttpError('Request failed with status code 404', {
                url: `https://api.ebay.com${path}`,
                status: 404,
                data: ebayErrorBody,
              }),
            }),
          ),
        ),
      ),
    } as unknown as EbayApiClient;

    const error = await Effect.runPromise(Effect.flip(requestGetEffect(client, path)));

    expect(error).toBeInstanceOf(EbayApiError);
    expect(error).toMatchObject({
      _tag: 'EbayApiError',
      method: 'GET',
      path,
      message: 'eBay API Error: The SKU value MISSING-SKU was not found.',
      status: 404,
      kind: 'httpStatus',
      ebayErrors: ebayErrorBody.errors,
    });
  });
});
