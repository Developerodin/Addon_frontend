"use client";

import type { BarcodeGenerateRequest, PickList, PackList } from "./types";
import { generateDummyPickList, generateDummyPackList } from "./dummyData";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// UI-only mock API placeholders (NO backend implementation)
export const pickPackMockApi = {
  async fetchPickList(): Promise<PickList> {
    await sleep(250);
    return generateDummyPickList();
  },

  async fetchPackList(): Promise<PackList> {
    await sleep(250);
    return generateDummyPackList();
  },

  async confirmPick(_args: { itemId: string; pickedQty: number }): Promise<{ ok: true }> {
    await sleep(120);
    return { ok: true };
  },

  async setPackedQty(_args: {
    batchId: string;
    orderId: string;
    itemId: string;
    packedQty: number;
  }): Promise<{ ok: true }> {
    await sleep(120);
    return { ok: true };
  },

  async generateBarcodes(_args: {
    batchId: string;
    orderId: string;
    itemIds: string[];
    request: BarcodeGenerateRequest;
  }): Promise<{ ok: true }> {
    await sleep(180);
    return { ok: true };
  },

  async generateCarton(_args: { batchId: string }): Promise<{ ok: true }> {
    await sleep(120);
    return { ok: true };
  },
};

