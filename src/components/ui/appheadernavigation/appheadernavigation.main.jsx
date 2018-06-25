/**
 * Copyright © 2018 Elastic Path Software Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 *
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Link } from 'react-router-dom';
import { login } from '../../../utils/AuthService.js';

var Config = require('Config')

// Array of zoom parameters to pass to Cortex
var zoomArray = [
    'element'
];

class AppHeaderNavigationMain extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            navigations: []
        };
    }
    componentWillMount() {
        login().then(() => {
            fetch(Config.cortexApi.path + '/navigations/' + Config.cortexApi.scope + '?zoom=' + zoomArray.join(),
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': localStorage.getItem(Config.cortexApi.scope + '_oAuthToken')
                    }
                })
                .then(res => res.json())
                .then(res => {
                    this.setState({
                        navigations: res._element
                    });
                })
                .catch(error => {
                    console.log(error)
                });
        });
    }
    renderCategories() {
        return this.state.navigations.map(category => {
            return (
                <li key={category.name} data-name={category["display-name"]} data-el-container="category-nav-item-container">
                    <Link to={"/category/" + encodeURIComponent(category.self.href)} className="nav-item" id={"header_navbar_category_button_" + category.name} data-target=".navbar-collapse" title={category["display-name"]}><span>{category["display-name"]}</span></Link>
                </li>
            );
        })
    }
    render() {
        return (
            <div className="main-nav-container" id="header_navbar_container" data-region="mainNavRegion" style={{ display: 'block' }}>
                <div>
                    <nav className="main-nav">
                        <button className="btn-main-nav-toggle btn-link-cmd" id="header_navbar_container_categories_button" style={{ display: 'none' }}>
                            Categories
                                </button>
                        <ul className="main-nav-list nav navbar-nav" data-region="mainNavList">
                            {this.renderCategories()}
                        </ul>
                    </nav>
                </div>
            </div>
        );
    }
}

export default AppHeaderNavigationMain;