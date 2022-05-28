import { CodecValidationError } from "@hexworks/cobalt-data";
import { HTTPDataTransferError } from "./HTTPDataTransferError";
import { InternalDataTransferError } from "./InternalDataTransferError";
import { RemoteDataTransferError } from "./RemoteDataTransferError";
import { UnknownDataTransferError } from "./UnknownDataTransferError";

export type DataTransferError =
    | HTTPDataTransferError
    | CodecValidationError
    | InternalDataTransferError
    | RemoteDataTransferError
    | UnknownDataTransferError;
