/**
 * Fetches rack/slot details using yarn-boxes and yarn-cones APIs.
 * Uses /by-storage-location/:storageLocation for boxes and cones.
 */
import yarnBoxService, { YarnBox } from "@/shared/services/yarnBoxService";
import yarnConeService, { YarnCone } from "@/shared/services/yarnConeService";
import {
  StorageSlot,
  SlotDetailsResponse,
  BoxInSlot,
  ConeInSlot,
} from "@/shared/services/storageSlotService";

/** Map YarnBox to BoxInSlot format */
function mapYarnBoxToBoxInSlot(box: YarnBox, storageLocation: string): BoxInSlot {
  return {
    _id: box._id ?? box.id ?? box.boxId ?? "",
    tearweight: box.tearweight ?? 0,
    storedStatus: box.storedStatus ?? false,
    boxId: box.boxId,
    poNumber: box.poNumber ?? "",
    barcode: box.barcode,
    yarnName: box.yarnName ?? "",
    orderDate: box.orderDate ?? "",
    orderQty: box.orderQty ?? 0,
    receivedDate: box.receivedDate ?? "",
    createdAt: box.createdAt ?? "",
    updatedAt: box.updatedAt ?? "",
    boxWeight: box.boxWeight ?? 0,
    lotNumber: box.lotNumber ?? "",
    numberOfCones: box.numberOfCones ?? 0,
    shadeCode: box.shadeCode ?? "",
    qcData: box.qcData
      ? {
          date: box.qcData.date,
          remarks: box.qcData.remarks,
          status: box.qcData.status,
          user: box.qcData.user,
          username: box.qcData.username,
        }
      : undefined,
    coneData: box.coneData,
    storageLocation,
  };
}

/** Map YarnCone to ConeInSlot format */
function mapYarnConeToConeInSlot(cone: YarnCone): ConeInSlot {
  return {
    _id: cone._id,
    issueStatus: cone.issueStatus,
    returnStatus: cone.returnStatus,
    poNumber: cone.poNumber,
    boxId: cone.boxId,
    coneWeight: cone.coneWeight,
    tearWeight: cone.tearWeight,
    yarnName: cone.yarnName,
    shadeCode: cone.shadeCode,
    issueWeight: cone.issueWeight,
    returnWeight: cone.returnWeight,
    coneStorageId: cone.coneStorageId ?? "",
    barcode: cone.barcode,
    createdAt: cone.createdAt,
    updatedAt: cone.updatedAt,
  };
}

/**
 * Build minimal StorageSlot from rack-like data (when storage API not used).
 */
function buildSlotFromRack(
  storageLocation: string,
  zoneType: string,
  rackLabel?: string
): StorageSlot {
  return {
    _id: storageLocation,
    label: rackLabel ?? storageLocation,
    barcode: storageLocation,
    floorNumber: 0,
    shelfNumber: 0,
    zoneCode: zoneType,
    isActive: true,
    createdAt: "",
    updatedAt: "",
  };
}

/**
 * Fetch rack details using yarn-boxes and yarn-cones APIs.
 * GET /yarn-boxes/by-storage-location/:storageLocation
 * GET /yarn-cones/by-storage-location/:storageLocation (coneStorageId)
 */
export async function fetchRackDetailsFromYarnApis(
  storageLocation: string,
  zoneType: string = "LT",
  existingSlot?: StorageSlot | null
): Promise<SlotDetailsResponse> {
  // 1. Use provided slot or build minimal from storageLocation
  const slot: StorageSlot =
    existingSlot ??
    buildSlotFromRack(storageLocation, zoneType, storageLocation);

  // 2. Fetch boxes and cones from yarn-boxes and yarn-cones APIs
  const [boxesRes, conesRes] = await Promise.all([
    yarnBoxService.getBoxesByStorageLocation(storageLocation),
    yarnConeService.getConesByStorageLocation(storageLocation),
  ]);

  const boxes = Array.isArray(boxesRes) ? boxesRes : [];
  const cones = Array.isArray(conesRes) ? conesRes : [];

  // 3. Prefer boxes if any, else cones
  if (boxes.length > 0) {
    const boxData: BoxInSlot[] = boxes.map((b) =>
      mapYarnBoxToBoxInSlot(b, storageLocation)
    );
    return {
      storageSlot: slot,
      zoneType,
      type: "boxes",
      count: boxData.length,
      data: boxData,
    };
  }

  if (cones.length > 0) {
    const coneData: ConeInSlot[] = cones.map(mapYarnConeToConeInSlot);
    return {
      storageSlot: slot,
      zoneType,
      type: "cones",
      count: coneData.length,
      data: coneData,
    };
  }

  // Empty slot - return with empty boxes (default for LT) or cones (default for ST)
  const defaultType = zoneType === "ST" ? "cones" : "boxes";
  return {
    storageSlot: slot,
    zoneType,
    type: defaultType,
    count: 0,
    data: [],
  };
}
