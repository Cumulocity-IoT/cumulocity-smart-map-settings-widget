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

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({providedIn:'root'})
export class LocationSearchService {
    private latField: any = '';
    private lngField: any = '';
    private locationSearchAPI: String = '';
    constructor() {}

    /**
     * Set Location Search API settings from configuraiton
     */
    setSearchSettings(searchAPI: String, latField: String, lngField: String) {
        this.latField = latField;
        this.lngField = lngField;
        this.locationSearchAPI = searchAPI;
    }

    isSearchDisplay() {
        return ( this.locationSearchAPI && this.latField && this.lngField);
    }

    /**
     * Search Geo Loaction based on given search text
     */
    searchGeoLocationURL(searchText) {
        return (this.locationSearchAPI + searchText);
    }

    getLatField() {
        return this.latField;
    }

    getLngField() {
        return this.lngField;
    }
}
