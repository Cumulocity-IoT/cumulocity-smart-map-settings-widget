/**
 * Copyright (c) 2020 Software AG, Darmstadt, Germany and/or its licensors
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { isDevMode, Injectable } from '@angular/core';
import { InventoryBinaryService, InventoryService, IManagedObject,
    IResultList, MeasurementService, IResult, IManagedObjectBinary } from '@c8y/client';
import { Observable } from 'rxjs';

@Injectable()
export class Commonc8yService {

    devices: any[];
    constructor(
        private invSvc: InventoryService,
        private msmtSvc: MeasurementService,
        private inventoryBinaryService: InventoryBinaryService
        ) { }


    // Upload image file
    public createBinary(floorMap): Promise<IResult<IManagedObjectBinary>> {
        return this.inventoryBinaryService.create(floorMap.file, {level: floorMap.level,
             buildingId: floorMap.buildingId, file: {name: floorMap.file.name}});
    }

    // Delete image file
    public deleteBinary(id): Promise<IResult<IManagedObjectBinary>> {
        return this.inventoryBinaryService.delete(id);
    }

    // Download image file
    public downloadBinary(id): any {
        return this.inventoryBinaryService.download(id);
    }

    /**
     * Retrieve the details for the specified managed object as a Promise
     *
     * @param deviceId Id of the managed object
     */
    getTargetObject(deviceId: String): any {
        if (isDevMode()) { console.log('+-+- checking for ', deviceId); }
        return new Promise(
            (resolve, reject) => {
                this.invSvc.detail(deviceId)
                    .then((resp) => {
                        if (isDevMode()) { console.log('+-+- DETAILS FOR MANAGED OBJECT ' + deviceId, resp); }
                        if (resp.res.status === 200) {
                            resolve(resp.data);
                        } else {
                            reject(resp);
                        }
                    });
            });
    }

    /**
     * This service will recursively get all the child devices for the given device id and return a promise with the result list.
     *
     * @param id ID of the managed object to check for child devices
     * @param pageToGet Number of the page passed to the API
     * @param allDevices Child Devices already found
     */
    getChildDevices(id: string, pageToGet: number, allDevices: { data: any[], res: any }): Promise<IResultList<IManagedObject>> {
        const inventoryFilter = {
            // fragmentType: 'c8y_IsDevice',
            pageSize: 50,
            withTotalPages: true,
            currentPage: pageToGet
        };
        if (!allDevices) {
            allDevices = { data: [], res: null };
        }
        return new Promise(
            (resolve, reject) => {
                this.invSvc.childAssetsList(id, inventoryFilter)
                    .then((resp) => {
                        if (resp.res.status === 200) {
                            if (resp.data && resp.data.length >= 0) {
                                allDevices.data.push.apply(allDevices.data, resp.data);
                                if (isDevMode()) { console.log('+-+- checking on devices found\n', resp); }
                                // response does not have totalPages... :(
                                // suppose that if # of devices is less that the page size, then all devices have already been retrieved
                                if (resp.data.length < inventoryFilter.pageSize) {
                                    resolve(allDevices);
                                } else {
                                    this.getChildDevices(id, resp.paging.nextPage, allDevices)
                                        .then((np) => {
                                            resolve(allDevices);
                                        })
                                        .catch((err) => reject(err));
                                }
                            }
                            // resolve(resp);
                        } else {
                            reject(resp);
                        }
                    });
            });
    }

    // Regular expression for validation
    generateRegEx(input) {
        const name = input + '';
        const nameLower = name.toLowerCase();
        const nameUpper = name.toUpperCase();
        let regex = '*';
        const numRegex = new RegExp(/^([0-9]+)$/);
        const splCharRegex = new RegExp(/^([,._-]+)$/);
        for (let i = 0; i < name.length; i++) {
          if (name.charAt(i) === ' ') {
            regex += ' ';
          } else if (name.charAt(i).match(numRegex)) {
            regex += '[' + name.charAt(i) + ']';
          } else if (name.charAt(i).match(splCharRegex)) {
            regex += '[' + name.charAt(i) + ']';
          } else {
            regex += '[' + nameLower.charAt(i) + '|' + nameUpper.charAt(i) + ']';
          }
        }
        regex += '*';
        return regex;
    }

    // Get All devices based on query search parameter

    getAllDevices(pageToGet: number, searchName?: any): Promise<IResultList<IManagedObject>> {
        const inventoryFilter = {
            pageSize: 10,
            withTotalPages: true,
            currentPage: pageToGet
        };
        if (searchName) {
            inventoryFilter['query'] = `$filter=((has(c8y_IsDevice) or has(c8y_IsAsset)) and (name eq '${this.generateRegEx(searchName)}'))`;
        } else {
            inventoryFilter['query'] = `$filter=(has(c8y_IsDevice) has(c8y_IsAsset))`;
        }
        return new Promise(
            (resolve, reject) => {
                this.invSvc.list(inventoryFilter)
                    .then((resp) => {
                        if (resp.res.status === 200) {
                            resolve(resp);
                        } else {
                            reject(resp);
                        }
                    });
            });


    }

    /**
     * This service will recursively get all the child devices for the given device id.
     *
     * @param id ID of the managed object to check for child additions
     * @param pageToGet Number of the page passed to the API
     * @param allAdditions Child additions already found... the newly found additions will be aded here
     * @param type Type of addition to return... the service does not use the "fragmentType"
     */
    getChildAdditions(id: string, pageToGet: number,
        allAdditions: { data: any[], res: any }, type: string): Promise<IResultList<IManagedObject>> {
        const inventoryFilter = {
            // fragmentType: type,
            // valueFragmentType: type,
            // type: type,
            pageSize: 15,
            withTotalPages: true,
            currentPage: pageToGet
        };
        if (!allAdditions) {
            allAdditions = { data: [], res: null };
        }
        return new Promise(
            (resolve, reject) => {
                this.invSvc.childAdditionsList(id, inventoryFilter)
                    .then((resp) => {
                        if (resp.res.status === 200) {
                            if (resp.data && resp.data.length >= 0) {
                                allAdditions.data.push.apply(allAdditions.data, resp.data);
                                if (isDevMode()) { console.log('+-+- checking on additions found\n', resp); }
                                // response does not have totalPages... :(
                                // suppose that if # of devices is less that the page size, then all devices have already been retrieved
                                if (resp.data.length < inventoryFilter.pageSize) {
                                    allAdditions.data = allAdditions.data.filter(d => {
                                        return d.type && d.type.localeCompare(type) === 0;
                                    });
                                    resolve(allAdditions);
                                } else {
                                    this.getChildAdditions(id, resp.paging.nextPage, allAdditions, type)
                                        .then((np) => {
                                            resolve(allAdditions);
                                        })
                                        .catch((err) => reject(err));
                                }
                            }
                        } else {
                            reject(resp);
                        }
                    });
            });
    }

    /**
     * Get Inventory list based on type
     */
    getInventoryItems(pageToGet: number, allInventoryItems: { data: any[], res: any }, type: string): Promise<IResultList<IManagedObject>> {
        let inventoryFilter: any;
        inventoryFilter = {
            pageSize: 50,
            withTotalPages: true,
            currentPage: pageToGet,
            query: `type eq ${type}`
        };
        if (!allInventoryItems) {
            allInventoryItems = { data: [], res: null };
        }
        return new Promise(
            (resolve, reject) => {
                this.invSvc.list(inventoryFilter)
                    .then((resp) => {
                        if (resp.res.status === 200) {
                            if (resp.data && resp.data.length >= 0) {
                                allInventoryItems.data.push.apply(allInventoryItems.data, resp.data);
                                if (isDevMode()) { console.log('+-+- checking on inventory items found\n', resp); }
                                // response does not have totalPages... :(
                                // suppose that if # of devices is less that the page size, then all devices have already been retrieved
                                if (resp.data.length < inventoryFilter.pageSize) {
                                    // remove the additions that does not fit into the given type, if any
                                    resolve(allInventoryItems);
                                } else {
                                    this.getInventoryItems(resp.paging.nextPage, allInventoryItems, type)
                                        .then((np) => {
                                            resolve(allInventoryItems);
                                        })
                                        .catch((err) => reject(err));
                                }
                            }
                        } else {
                            reject(resp);
                        }
                    });
            });
    }

    /**
     * Creates the given object using the InventoryService.
     *
     * @param managedObject Object to be created
     * @returns Promise object with the result of the service call
     */
    createManagedObject(managedObject): Promise<any> {
        if (isDevMode()) { console.log('+-+- CREATING MANAGED OBJECT '); }

        return this.invSvc.create(managedObject);
        /* return new Promise(
            (resolve, reject) => {
                this.invSvc.create(managedObject)
                    .then((resp) => {
                        if (isDevMode()) { console.log('+-+- DETAILS FOR MANAGED OBJECT CREATION', resp); }
                        // successful return code is 201 Created
                        if (resp.res.status === 201) {
                            resolve(resp.data);
                        } else {
                            reject(resp);
                        }
                    });
            }); */
    }

    updateManagedObject(managedObject): Promise<any> {
        if (isDevMode()) { console.log('+-+- CREATING MANAGED OBJECT '); }

        return this.invSvc.update(managedObject);
    }

    deleteManagedObject(id): Promise<any> {
        return this.invSvc.delete(id);
    }


    /**
     *
     * @param input Validate JSON Input
     */
    isValidJson(input: any) {
        try {
            if (input) {
                const o = JSON.parse(input);
                if (o && o.constructor === Object) {
                    return o;
                }
            }
        } catch (e) { }
        return false;
    }

}
