# Segment Public API operations

Generated from the Segment Public API spec v74.0.1 by `tools/update-spec.mjs`. Do not edit by hand.

Each line: `METHOD path` · `operationId` · summary · versions, most stable first.
Operations marked *alpha only* or *beta only* have no stable version; the CLI sends the right media type automatically.
Run `segment describe <operationId>` for parameters and the request body schema.

## Activations

- `POST /spaces/{spaceId}/activations/batch` · `batchQueryActivationsForSpace` · Batch Query Activations for Space · v1alpha · *alpha only*
- `GET /spaces/{spaceId}/audiences/{audienceId}/activations` · `listActivationsFromAudience` · List Activations from Audience · v1alpha · *alpha only*
- `DELETE /spaces/{spaceId}/audiences/{audienceId}/activations/{id}` · `removeActivationFromAudience` · Remove Activation from Audience · v1alpha · *alpha only*
- `GET /spaces/{spaceId}/audiences/{audienceId}/activations/{id}` · `getActivationFromAudience` · Get Activation from Audience · v1alpha · *alpha only*
- `PATCH /spaces/{spaceId}/audiences/{audienceId}/activations/{id}` · `updateActivationForAudience` · Update Activation for Audience · v1alpha · *alpha only*
- `GET /spaces/{spaceId}/audiences/{audienceId}/destination-connections` · `listDestinationsFromAudience` · List Destinations from Audience · v1alpha · *alpha only*
- `POST /spaces/{spaceId}/audiences/{audienceId}/destination-connections` · `addDestinationToAudience` · Add Destination to Audience · v1alpha · *alpha only*
- `POST /spaces/{spaceId}/audiences/{audienceId}/destination-connections/{connectionId}/activations` · `addActivationToAudience` · Add Activation to Audience · v1alpha · *alpha only*
- `DELETE /spaces/{spaceId}/audiences/{audienceId}/destination-connections/{destinationId}` · `removeDestinationFromAudience` · Remove Destination from Audience · v1alpha · *alpha only*
- `PATCH /spaces/{spaceId}/audiences/{audienceId}/destination-connections/{destinationId}` · `updateDestinationForAudience` · Update Destination for Audience · v1alpha · *alpha only*
- `GET /spaces/{spaceId}/audienceType/{audienceType}/supported-destinations` · `listSupportedDestinationsFromAudience` · List Supported Destinations from Audience · v1alpha · *alpha only*

## Audiences

- `GET /spaces/{spaceId}/audiences` · `listAudiences` · List Audiences · v1, v1beta, v1alpha
- `POST /spaces/{spaceId}/audiences` · `createAudience` · Create Audience · v1, v1beta, v1alpha
- `POST /spaces/{spaceId}/audiences/{audienceId}/runs` · `forceExecuteAudienceRun` · Force Execute Audience Run · v1, v1alpha
- `DELETE /spaces/{spaceId}/audiences/{id}` · `removeAudienceFromSpace` · Remove Audience from Space · v1, v1beta, v1alpha
- `GET /spaces/{spaceId}/audiences/{id}` · `getAudience` · Get Audience · v1, v1beta, v1alpha
- `PATCH /spaces/{spaceId}/audiences/{id}` · `updateAudienceForSpace` · Update Audience for Space · v1, v1beta, v1alpha
- `GET /spaces/{spaceId}/audiences/{id}/audience-references` · `listAudienceConsumersFromSpaceAndAudience` · List Audience Consumers from Space And Audience · v1, v1alpha
- `GET /spaces/{spaceId}/audiences/{id}/schedules` · `listAudienceSchedulesFromSpaceAndAudience` · List Audience Schedules from Space And Audience · v1, v1alpha
- `POST /spaces/{spaceId}/audiences/{id}/schedules` · `addAudienceScheduleToAudience` · Add Audience Schedule to Audience · v1, v1alpha
- `DELETE /spaces/{spaceId}/audiences/{id}/schedules/{scheduleId}` · `removeAudienceScheduleFromAudience` · Remove Audience Schedule from Audience · v1, v1alpha
- `GET /spaces/{spaceId}/audiences/{id}/schedules/{scheduleId}` · `getAudienceScheduleFromSpaceAndAudience` · Get Audience Schedule from Space And Audience · v1, v1alpha
- `PATCH /spaces/{spaceId}/audiences/{id}/schedules/{scheduleId}` · `updateAudienceScheduleForAudience` · Update Audience Schedule for Audience · v1, v1alpha
- `POST /spaces/{spaceId}/audiences/previews` · `createAudiencePreview` · Create Audience Preview · v1, v1beta, v1alpha
- `GET /spaces/{spaceId}/audiences/previews/{id}` · `getAudiencePreview` · Get Audience Preview · v1, v1beta, v1alpha

## Spaces

- `GET /spaces` · `listSpaces` · List Spaces · v1alpha · *alpha only*
- `GET /spaces/{spaceId}` · `getSpace` · Get Space · v1alpha · *alpha only*

## Warehouses

- `GET /warehouses` · `listWarehouses` · List Warehouses · v2, v1, v1beta, v1alpha
- `POST /warehouses` · `createWarehouse` · Create Warehouse · v2, v1, v1beta, v1alpha
- `DELETE /warehouses/{warehouseId}` · `deleteWarehouse` · Delete Warehouse · v2, v1, v1beta, v1alpha
- `GET /warehouses/{warehouseId}` · `getWarehouse` · Get Warehouse · v2, v1, v1beta, v1alpha
- `PATCH /warehouses/{warehouseId}` · `updateWarehouse` · Update Warehouse · v2, v1, v1beta, v1alpha
- `GET /warehouses/{warehouseId}/connected-sources` · `listConnectedSourcesFromWarehouse` · List Connected Sources from Warehouse · v2, v1, v1beta, v1alpha
- `DELETE /warehouses/{warehouseId}/connected-sources/{sourceId}` · `removeSourceConnectionFromWarehouse` · Remove Source Connection from Warehouse · v2, v1, v1beta, v1alpha
- `POST /warehouses/{warehouseId}/connected-sources/{sourceId}` · `addConnectionFromSourceToWarehouse` · Add Connection from Source to Warehouse · v2, v1, v1beta, v1alpha
- `GET /warehouses/{warehouseId}/connection-state` · `getConnectionStateFromWarehouse` · Get Connection State from Warehouse · v2, v1, v1beta, v1alpha
- `POST /warehouses/validation` · `createValidationInWarehouse` · Create Validation in Warehouse · v2, v1, v1beta, v1alpha

## Sources

- `GET /sources` · `listSources` · List Sources · v1, v1beta, v1alpha
- `POST /sources` · `createSource` · Create Source · v1, v1beta, v1alpha
- `DELETE /sources/{sourceId}` · `deleteSource` · Delete Source · v1, v1beta, v1alpha
- `GET /sources/{sourceId}` · `getSource` · Get Source · v1, v1beta, v1alpha
- `PATCH /sources/{sourceId}` · `updateSource` · Update Source · v1, v1beta, v1alpha
- `GET /sources/{sourceId}/connected-destinations` · `listConnectedDestinationsFromSource` · List Connected Destinations from Source · v1, v1beta, v1alpha
- `GET /sources/{sourceId}/connected-warehouses` · `listConnectedWarehousesFromSource` · List Connected Warehouses from Source · v1, v1beta, v1alpha
- `POST /sources/{sourceId}/labels` · `addLabelsToSource` · Add Labels to Source · v1, v1beta, v1alpha
- `PUT /sources/{sourceId}/labels` · `replaceLabelsInSource` · Replace Labels in Source · v1, v1beta, v1alpha
- `GET /sources/{sourceId}/settings` · `listSchemaSettingsInSource` · List Schema Settings in Source · v1, v1beta, v1alpha
- `PATCH /sources/{sourceId}/settings` · `updateSchemaSettingsInSource` · Update Schema Settings in Source · v1, v1beta, v1alpha
- `POST /sources/{sourceId}/writekey` · `createWriteKeyForSource` · Create Write Key for Source · v1alpha · *alpha only*
- `DELETE /sources/{sourceId}/writekey/{writeKey}` · `removeWriteKeyFromSource` · Remove Write Key from Source · v1alpha · *alpha only*

## Reverse ETL

- `GET /reverse-etl-models` · `listReverseEtlModels` · List Reverse Etl Models · v1alpha · *alpha only*
- `POST /reverse-etl-models` · `createReverseEtlModel` · Create Reverse Etl Model · v1alpha · *alpha only*
- `DELETE /reverse-etl-models/{modelId}` · `deleteReverseEtlModel` · Delete Reverse Etl Model · v1alpha · *alpha only*
- `GET /reverse-etl-models/{modelId}` · `getReverseEtlModel` · Get Reverse Etl Model · v1alpha · *alpha only*
- `PATCH /reverse-etl-models/{modelId}` · `updateReverseEtlModel` · Update Reverse Etl Model · v1alpha · *alpha only*
- `GET /reverse-etl-models/{modelId}/subscriptionId/{subscriptionId}/syncs` · `listReverseETLSyncStatusesFromModelAndSubscriptionId` · List Reverse ETL Sync Statuses from Model And Subscription Id · v1alpha · *alpha only*
- `GET /reverse-etl-models/{modelId}/syncs/{syncId}` · `getReverseETLSyncStatus` · Get Reverse ETL Sync Status · v1alpha · *alpha only*
- `POST /reverse-etl-models/{modelId}/syncs/{syncId}/cancel` · `cancelReverseETLSyncForModel` · Cancel Reverse ETL Sync for Model · v1alpha · *alpha only*
- `POST /reverse-etl-syncs` · `createReverseETLManualSync` · Create Reverse ETL Manual Sync · v1alpha · *alpha only*

## Deletion and Suppression

- `GET /regulations` · `listWorkspaceRegulations` · List Workspace Regulations · v1, v1beta, v1alpha
- `POST /regulations` · `createWorkspaceRegulation` · Create Workspace Regulation · v1, v1beta, v1alpha
- `GET /regulations/{regulateId}` · `getRegulation` · Get Regulation · v1, v1beta, v1alpha
- `POST /regulations/cloudsources/{sourceId}` · `createCloudSourceRegulation` · Create Cloud Source Regulation · v1, v1beta, v1alpha
- `GET /regulations/sources/{sourceId}` · `listRegulationsFromSource` · List Regulations from Source · v1, v1beta, v1alpha
- `POST /regulations/sources/{sourceId}` · `createSourceRegulation` · Create Source Regulation · v1, v1beta, v1alpha
- `GET /suppressions` · `listSuppressions` · List Suppressions · v1, v1beta, v1alpha

## Credentials

- `GET /credentials` · `listCredentials` · List Credentials · v1
- `POST /credentials` · `createCredential` · Create Credential · v1
- `DELETE /credentials/{credentialId}` · `deleteCredential` · Delete Credential · v1
- `GET /credentials/{credentialId}` · `getCredential` · Get Credential · v1
- `PATCH /credentials/{credentialId}` · `updateCredential` · Update Credential · v1
- `GET /credentials/{credentialId}/consumers` · `listCredentialConsumers` · List Credential Consumers · v1

## dbt

- `POST /dbt-model-syncs/trigger` · `createDbtModelSyncTrigger` · Create Dbt Model Sync Trigger · v1beta · *beta only*

## Destinations

- `GET /destinations` · `listDestinations` · List Destinations · v1, v1beta, v1alpha
- `POST /destinations` · `createDestination` · Create Destination · v1, v1beta, v1alpha
- `DELETE /destinations/{destinationId}` · `deleteDestination` · Delete Destination · v1, v1beta, v1alpha
- `GET /destinations/{destinationId}` · `getDestination` · Get Destination · v1, v1beta, v1alpha
- `PATCH /destinations/{destinationId}` · `updateDestination` · Update Destination · v1, v1beta, v1alpha
- `GET /destinations/{destinationId}/delivery-metrics` · `listDeliveryMetricsSummaryFromDestination` · List Delivery Metrics Summary from Destination · v1beta, v1alpha · *beta only*
- `GET /destinations/{destinationId}/subscriptions` · `listSubscriptionsFromDestination` · List Subscriptions from Destination · v1alpha · *alpha only*
- `POST /destinations/{destinationId}/subscriptions` · `createDestinationSubscription` · Create Destination Subscription · v1alpha · *alpha only*
- `DELETE /destinations/{destinationId}/subscriptions/{id}` · `removeSubscriptionFromDestination` · Remove Subscription from Destination · v1alpha · *alpha only*
- `GET /destinations/{destinationId}/subscriptions/{id}` · `getSubscriptionFromDestination` · Get Subscription from Destination · v1alpha · *alpha only*
- `PATCH /destinations/{destinationId}/subscriptions/{id}` · `updateSubscriptionForDestination` · Update Subscription for Destination · v1alpha · *alpha only*

## Destination Filters

- `GET /destination/{destinationId}/filters` · `listFiltersFromDestination` · List Filters from Destination · v1, v1beta, v1alpha
- `POST /destination/{destinationId}/filters` · `createFilterForDestination` · Create Filter for Destination · v1, v1beta, v1alpha
- `DELETE /destination/{destinationId}/filters/{filterId}` · `removeFilterFromDestination` · Remove Filter from Destination · v1, v1beta, v1alpha
- `GET /destination/{destinationId}/filters/{filterId}` · `getFilterInDestination` · Get Filter in Destination · v1, v1beta, v1alpha
- `PATCH /destination/{destinationId}/filters/{filterId}` · `updateFilterForDestination` · Update Filter for Destination · v1, v1beta, v1alpha
- `POST /destination/filters/preview` · `previewDestinationFilter` · Preview Destination Filter · v1, v1beta, v1alpha

## Functions

- `GET /functions` · `listFunctions` · List Functions · v1, v1beta, v1alpha
- `POST /functions` · `createFunction` · Create Function · v1, v1beta, v1alpha
- `DELETE /functions/{functionId}` · `deleteFunction` · Delete Function · v1, v1beta, v1alpha
- `GET /functions/{functionId}` · `getFunction` · Get Function · v1, v1beta, v1alpha
- `PATCH /functions/{functionId}` · `updateFunction` · Update Function · v1, v1beta, v1alpha
- `POST /functions/{functionId}/deploy` · `createFunctionDeployment` · Create Function Deployment · v1, v1beta, v1alpha
- `GET /functions/{functionId}/versions` · `listFunctionVersions` · List Function Versions · v1alpha · *alpha only*
- `POST /functions/{functionId}/versions` · `restoreFunctionVersion` · Restore Function Version · v1alpha · *alpha only*
- `GET /functions/{functionId}/versions/{versionId}` · `getFunctionVersion` · Get Function Version · v1alpha · *alpha only*
- `GET /insert-function-instances` · `listInsertFunctionInstances` · List Insert Function Instances · v1alpha · *alpha only*
- `POST /insert-function-instances` · `createInsertFunctionInstance` · Create Insert Function Instance · v1alpha · *alpha only*
- `DELETE /insert-function-instances/{instanceId}` · `deleteInsertFunctionInstance` · Delete Insert Function Instance · v1alpha · *alpha only*
- `GET /insert-function-instances/{instanceId}` · `getInsertFunctionInstance` · Get Insert Function Instance · v1alpha · *alpha only*
- `PATCH /insert-function-instances/{instanceId}` · `updateInsertFunctionInstance` · Update Insert Function Instance · v1alpha · *alpha only*

## Live Plugins

- `POST /sources/{sourceId}/live-plugins/create` · `createLivePlugin` · Create Live Plugin · v1alpha · *alpha only*
- `DELETE /sources/{sourceId}/live-plugins/delete-code` · `deleteLivePluginCode` · Delete Live Plugin Code · v1alpha · *alpha only*
- `GET /sources/{sourceId}/live-plugins/latest` · `getLatestFromLivePlugins` · Get Latest from Live Plugins · v1alpha · *alpha only*

## Profiles Sync

- `GET /spaces/{spaceId}/profiles-warehouses` · `listProfilesWarehouseInSpace` · List Profiles Warehouse in Space · v1alpha · *alpha only*
- `POST /spaces/{spaceId}/profiles-warehouses` · `createProfilesWarehouse` · Create Profiles Warehouse · v1alpha · *alpha only*
- `DELETE /spaces/{spaceId}/profiles-warehouses/{warehouseId}` · `removeProfilesWarehouseFromSpace` · Remove Profiles Warehouse from Space · v1alpha · *alpha only*
- `PATCH /spaces/{spaceId}/profiles-warehouses/{warehouseId}` · `updateProfilesWarehouseForSpaceWarehouse` · Update Profiles Warehouse for Space Warehouse · v1alpha · *alpha only*
- `GET /spaces/{spaceId}/profiles-warehouses/{warehouseId}/selective-syncs` · `listSelectiveSyncsFromWarehouseAndSpace` · List Selective Syncs from Warehouse And Space · v1alpha · *alpha only*
- `PATCH /spaces/{spaceId}/profiles-warehouses/{warehouseId}/selective-syncs` · `updateSelectiveSyncForWarehouseAndSpace` · Update Selective Sync for Warehouse And Space · v1alpha · *alpha only*

## Selective Sync

- `GET /warehouses/{warehouseId}/advanced-sync-schedule` · `getAdvancedSyncScheduleFromWarehouse` · Get Advanced Sync Schedule from Warehouse · v1, v1beta, v1alpha
- `PUT /warehouses/{warehouseId}/advanced-sync-schedule` · `replaceAdvancedSyncScheduleForWarehouse` · Replace Advanced Sync Schedule for Warehouse · v1, v1beta, v1alpha
- `GET /warehouses/{warehouseId}/connected-sources/{sourceId}/selective-syncs` · `listSelectiveSyncsFromWarehouseAndSource` · List Selective Syncs from Warehouse And Source · v1, v1beta, v1alpha
- `GET /warehouses/{warehouseId}/connected-sources/{sourceId}/syncs` · `listSyncsFromWarehouseAndSource` · List Syncs from Warehouse And Source · v1, v1beta, v1alpha
- `PATCH /warehouses/{warehouseId}/selective-sync` · `updateSelectiveSyncForWarehouse` · Update Selective Sync for Warehouse · v1, v1beta, v1alpha
- `GET /warehouses/{warehouseId}/syncs` · `listSyncsFromWarehouse` · List Syncs from Warehouse · v1, v1beta, v1alpha

## Catalog

- `GET /catalog/destinations` · `getDestinationsCatalog` · Get Destinations Catalog · v1, v1beta, v1alpha
- `GET /catalog/destinations/{destinationMetadataId}` · `getDestinationMetadata` · Get Destination Metadata · v1, v1beta, v1alpha
- `GET /catalog/sources` · `getSourcesCatalog` · Get Sources Catalog · v1, v1beta, v1alpha
- `GET /catalog/sources/{sourceMetadataId}` · `getSourceMetadata` · Get Source Metadata · v1, v1beta, v1alpha
- `GET /catalog/warehouses` · `getWarehousesCatalog` · Get Warehouses Catalog · v1, v1beta, v1alpha
- `GET /catalog/warehouses/{warehouseMetadataId}` · `getWarehouseMetadata` · Get Warehouse Metadata · v1, v1beta, v1alpha

## Delivery Overview

- `GET /delivery-overview/failed-delivery` · `getEgressFailedMetricsFromDeliveryOverview` · Get Egress Failed Metrics from Delivery Overview · v1beta · *beta only*
- `GET /delivery-overview/failed-on-ingest` · `getIngressFailedMetricsFromDeliveryOverview` · Get Ingress Failed Metrics from Delivery Overview · v1beta · *beta only*
- `GET /delivery-overview/filtered-at-destination` · `getFilteredAtDestinationMetricsFromDeliveryOverview` · Get Filtered At Destination Metrics from Delivery Overview · v1beta · *beta only*
- `GET /delivery-overview/filtered-at-source` · `getFilteredAtSourceMetricsFromDeliveryOverview` · Get Filtered At Source Metrics from Delivery Overview · v1beta · *beta only*
- `GET /delivery-overview/successful-delivery` · `getEgressSuccessMetricsFromDeliveryOverview` · Get Egress Success Metrics from Delivery Overview · v1beta · *beta only*
- `GET /delivery-overview/successfully-received` · `getIngressSuccessMetricsFromDeliveryOverview` · Get Ingress Success Metrics from Delivery Overview · v1beta · *beta only*

## IAM Users

- `DELETE /invites` · `deleteInvites` · Delete Invites · v1, v1beta, v1alpha
- `GET /invites` · `listInvites` · List Invites · v1, v1beta, v1alpha
- `POST /invites` · `createInvites` · Create Invites · v1, v1beta, v1alpha
- `DELETE /users` · `deleteUsers` · Delete Users · v1, v1beta, v1alpha
- `GET /users` · `listUsers` · List Users · v1, v1beta, v1alpha
- `GET /users/{userId}` · `getUser` · Get User · v1, v1beta, v1alpha
- `GET /users/{userId}/groups` · `listUserGroupsFromUser` · List User Groups from User · v1, v1beta, v1alpha
- `POST /users/{userId}/permissions` · `addPermissionsToUser` · Add Permissions to User · v1, v1beta, v1alpha
- `PUT /users/{userId}/permissions` · `replacePermissionsForUser` · Replace Permissions for User · v1, v1beta, v1alpha

## IAM Groups

- `DELETE /group/{userGroupId}/users` · `removeUsersFromUserGroup` · Remove Users from User Group · v1, v1beta, v1alpha
- `PUT /group/{userGroupId}/users` · `replaceUsersInUserGroup` · Replace Users in User Group · v1, v1beta, v1alpha
- `GET /groups` · `listUserGroups` · List User Groups · v1, v1beta, v1alpha
- `POST /groups` · `createUserGroup` · Create User Group · v1, v1beta, v1alpha
- `DELETE /groups/{userGroupId}` · `deleteUserGroup` · Delete User Group · v1, v1beta, v1alpha
- `GET /groups/{userGroupId}` · `getUserGroup` · Get User Group · v1, v1beta, v1alpha
- `PATCH /groups/{userGroupId}` · `updateUserGroup` · Update User Group · v1, v1beta, v1alpha
- `GET /groups/{userGroupId}/invites` · `listInvitesFromUserGroup` · List Invites from User Group · v1, v1beta, v1alpha
- `POST /groups/{userGroupId}/permissions` · `addPermissionsToUserGroup` · Add Permissions to User Group · v1, v1beta, v1alpha
- `PUT /groups/{userGroupId}/permissions` · `replacePermissionsForUserGroup` · Replace Permissions for User Group · v1, v1beta, v1alpha
- `GET /groups/{userGroupId}/users` · `listUsersFromUserGroup` · List Users from User Group · v1, v1beta, v1alpha
- `POST /groups/{userGroupId}/users` · `addUsersToUserGroup` · Add Users to User Group · v1, v1beta, v1alpha

## Labels

- `GET /labels` · `listLabels` · List Labels · v1, v1beta, v1alpha
- `POST /labels` · `createLabel` · Create Label · v1, v1beta, v1alpha
- `DELETE /labels/{key}/{value}` · `deleteLabel` · Delete Label · v1, v1beta, v1alpha

## Audit Trail

- `GET /audit-events` · `listAuditEvents` · List Audit Events · v1, v1beta, v1alpha

## IAM Roles

- `GET /roles` · `listRoles` · List Roles · v1, v1beta, v1alpha

## Tracking Plans

- `GET /tracking-plans` · `listTrackingPlans` · List Tracking Plans · v1, v1beta, v1alpha
- `POST /tracking-plans` · `createTrackingPlan` · Create Tracking Plan · v1, v1beta, v1alpha
- `DELETE /tracking-plans/{trackingPlanId}` · `deleteTrackingPlan` · Delete Tracking Plan · v1, v1beta, v1alpha
- `GET /tracking-plans/{trackingPlanId}` · `getTrackingPlan` · Get Tracking Plan · v1, v1beta, v1alpha
- `PATCH /tracking-plans/{trackingPlanId}` · `updateTrackingPlan` · Update Tracking Plan · v1, v1beta, v1alpha
- `DELETE /tracking-plans/{trackingPlanId}/rules` · `removeRulesFromTrackingPlan` · Remove Rules from Tracking Plan · v1, v1beta, v1alpha
- `GET /tracking-plans/{trackingPlanId}/rules` · `listRulesFromTrackingPlan` · List Rules from Tracking Plan · v1, v1beta, v1alpha
- `PATCH /tracking-plans/{trackingPlanId}/rules` · `updateRulesInTrackingPlan` · Update Rules in Tracking Plan · v1, v1beta, v1alpha
- `PUT /tracking-plans/{trackingPlanId}/rules` · `replaceRulesInTrackingPlan` · Replace Rules in Tracking Plan · v1, v1beta, v1alpha
- `DELETE /tracking-plans/{trackingPlanId}/sources` · `removeSourceFromTrackingPlan` · Remove Source from Tracking Plan · v1, v1beta, v1alpha
- `GET /tracking-plans/{trackingPlanId}/sources` · `listSourcesFromTrackingPlan` · List Sources from Tracking Plan · v1, v1beta, v1alpha
- `POST /tracking-plans/{trackingPlanId}/sources` · `addSourceToTrackingPlan` · Add Source to Tracking Plan · v1, v1beta, v1alpha

## Transformations

- `GET /transformations` · `listTransformations` · List Transformations · v1, v1beta, v1alpha
- `POST /transformations` · `createTransformation` · Create Transformation · v1, v1beta, v1alpha
- `DELETE /transformations/{transformationId}` · `deleteTransformation` · Delete Transformation · v1, v1beta, v1alpha
- `GET /transformations/{transformationId}` · `getTransformation` · Get Transformation · v1, v1beta, v1alpha
- `PATCH /transformations/{transformationId}` · `updateTransformation` · Update Transformation · v1, v1beta, v1alpha

## Computed Traits

- `GET /spaces/{spaceId}/computed-traits` · `listComputedTraits` · List Computed Traits · v1alpha · *alpha only*
- `POST /spaces/{spaceId}/computed-traits` · `createComputedTrait` · Create Computed Trait · v1alpha · *alpha only*
- `DELETE /spaces/{spaceId}/computed-traits/{id}` · `removeComputedTraitFromSpace` · Remove Computed Trait from Space · v1alpha · *alpha only*
- `GET /spaces/{spaceId}/computed-traits/{id}` · `getComputedTrait` · Get Computed Trait · v1alpha · *alpha only*
- `PATCH /spaces/{spaceId}/computed-traits/{id}` · `updateComputedTraitForSpace` · Update Computed Trait for Space · v1alpha · *alpha only*

## Space Filters

- `GET /filters` · `listFiltersForSpace` · List Filters for Space · v1beta, v1alpha · *beta only*
- `POST /filters` · `createFilterForSpace` · Create Filter for Space · v1beta, v1alpha · *beta only*
- `DELETE /filters/{id}` · `deleteFilterById` · Delete Filter By Id · v1beta, v1alpha · *beta only*
- `GET /filters/{id}` · `getFilterById` · Get Filter By Id · v1beta, v1alpha · *beta only*
- `PATCH /filters/{id}` · `updateFilterById` · Update Filter By Id · v1beta, v1alpha · *beta only*

## Space Schema API

- `GET /spaces/{spaceId}/entities/{entitySlug}/properties` · `listPropertiesFromEntity` · List Properties from Entity · v1alpha · *alpha only*
- `GET /spaces/{spaceId}/entities/{entitySlug}/properties/{propertyName}/sample-values` · `listSampleValuesFromEntityProperty` · List Sample Values from Entity Property · v1alpha · *alpha only*
- `GET /spaces/{spaceId}/entity-paths` · `listEntityPaths` · List Entity Paths · v1alpha · *alpha only*
- `GET /spaces/{spaceId}/events` · `listEvents` · List Events · v1alpha · *alpha only*
- `GET /spaces/{spaceId}/events/{eventName}/properties` · `listPropertiesFromEvent` · List Properties from Event · v1alpha · *alpha only*
- `GET /spaces/{spaceId}/events/{eventName}/properties/{propertyName}/sample-values` · `listSampleValuesFromEventProperty` · List Sample Values from Event Property · v1alpha · *alpha only*
- `GET /spaces/{spaceId}/traits` · `listTraits` · List Traits · v1alpha · *alpha only*
- `GET /spaces/{spaceId}/traits/{traitKey}/sample-values` · `listSampleValuesFromTrait` · List Sample Values from Trait · v1alpha · *alpha only*

## customer-insights

- `POST /customer-insights/download` · `createDownload` · Create Download · v1alpha · *alpha only*

## Testing

- `GET /echo` · `echo` · Echo · v1, v1alpha

## Workspaces

- `GET /` · `getWorkspace` · Get Workspace · v1, v1beta, v1alpha

## API Calls

- `GET /usage/api-calls/daily` · `getDailyWorkspaceAPICallsUsage` · Get Daily Workspace API Calls Usage · v1, v1beta, v1alpha
- `GET /usage/api-calls/sources/daily` · `getDailyPerSourceAPICallsUsage` · Get Daily Per Source API Calls Usage · v1, v1beta, v1alpha

## Monthly Tracked Users

- `GET /usage/mtu/daily` · `getDailyWorkspaceMTUUsage` · Get Daily Workspace MTU Usage · v1, v1beta, v1alpha
- `GET /usage/mtu/sources/daily` · `getDailyPerSourceMTUUsage` · Get Daily Per Source MTU Usage · v1, v1beta, v1alpha

## Events

- `GET /events/volume` · `getEventsVolumeFromWorkspace` · Get Events Volume from Workspace · v1, v1beta, v1alpha
