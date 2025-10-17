
// 当前选择状态
        let currentState = {
            path: [], // 当前路径 [{type: 'category', id: '网络问题', data: {...}}, ...]
            fault: null,
            searchMode: false
        };
       
        // 所有加载的JSON数据缓存
        const jsonDataCache = {};
       
        // 初始化应用
        document.addEventListener('DOMContentLoaded', () => {
            // 加载初始数据
            loadInitialData();
           
            // 初始化搜索功能
            initSearch();
        });
       
        // 加载初始数据
        async function loadInitialData() {
            try {
                showLoading();
               
                // 加载根目录下的categories.json文件
                const response = await fetch('data/categories.json');
               
                if (!response.ok) {
                    throw new Error(`加载数据失败: ${response.status} ${response.statusText}`);
                }
               
                const data = await response.json();
                jsonDataCache['root'] = data;
               
                // 渲染分类
                renderNavLevel(1, data.categories || []);
               
            } catch (error) {
                console.error('加载初始数据失败:', error);
               
                // 显示错误信息
                document.getElementById('nav-level-1').innerHTML = `
                    <div class="error">
                        <h3>数据加载失败</h3>
                        <p>${error.message}</p>
                        <button onclick="location.reload()">重新加载</button>
                    </div>
                `;
            }
        }
       
        // 显示加载状态
        function showLoading() {
            document.getElementById('nav-level-1').innerHTML = `
                <div class="nav-level-title">分类</div>
                <div class="loading">
                    <div class="spinner"></div>
                    <p>正在加载数据...</p>
                </div>
            `;
        }
       
        // 渲染导航层级
        function renderNavLevel(level, items, parentId = null) {
            const navLevel = document.getElementById(`nav-level-${level}`);
           
            // 如果这是第一个层级，清空并添加标题
            if (level === 1) {
                navLevel.innerHTML = '<div class="nav-level-title">分类</div>';
            } else {
                // 确保导航层级元素存在
                if (!navLevel) {
                    const newNavLevel = document.createElement('div');
                    newNavLevel.className = 'nav-level';
                    newNavLevel.id = `nav-level-${level}`;
                    newNavLevel.innerHTML = `<div class="nav-level-title">${getLevelTitle(level)}</div>`;
                   
                    // 插入到导航面板中
                    const navPanel = document.querySelector('.nav-panel');
                    navPanel.appendChild(newNavLevel);
                } else {
                    navLevel.innerHTML = `<div class="nav-level-title">${getLevelTitle(level)}</div>`;
                }
            }
           
            if (!items || items.length === 0) {
                navLevel.innerHTML += `
                    <div class="empty-message">
                        <p>当前分类下没有子分类</p>
                    </div>
                `;
                return;
            }
           
            // 渲染每个项目
            items.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.className = 'nav-item';
                itemElement.dataset.id = item.name;
                itemElement.dataset.parentId = parentId;
               
                // 添加图标
                const icon = document.createElement('span');
                icon.className = 'nav-item-icon';
                icon.innerHTML = '📁';
                itemElement.appendChild(icon);
               
                // 添加文本
                const text = document.createElement('span');
                text.textContent = item.name;
                itemElement.appendChild(text);
               
                // 点击事件
                itemElement.addEventListener('click', async () => {
                    // 更新当前路径
                    updateCurrentPath(level, item);
                   
                    // 更新面包屑
                    updateBreadcrumb();
                   
                    // 显示注意事项（如果有）
                    showNoticeIfAvailable();
                   
                    // 检查是否有下一层级
                    if (item.subcategories || item.ssubcategories || item.children) {
                        // 确定下一层级的数据
                        let nextLevelItems = [];
                        if (item.subcategories) {
                            nextLevelItems = item.subcategories;
                        } else if (item.ssubcategories) {
                            nextLevelItems = item.ssubcategories;
                        } else if (item.children) {
                            nextLevelItems = item.children;
                        }
                       
                        // 渲染下一层级
                        renderNavLevel(level + 1, nextLevelItems, item.name);
                       
                        // 隐藏更深的层级
                        hideDeeperLevels(level + 2);
                    } else if (item.file) {
                        // 如果有file属性，表示需要加载外部JSON文件
                        try {
                            // 检查缓存
                            if (!jsonDataCache[item.file]) {
                                const response = await fetch(`data/${item.file}`);
                                if (!response.ok) throw new Error('加载失败');
                                jsonDataCache[item.file] = await response.json();
                            }
                           
                            const fileData = jsonDataCache[item.file];
                           
                            // 渲染下一层级
                            renderNavLevel(level + 1, fileData.categories || fileData.subcategories || fileData.children, item.name);
                           
                            // 隐藏更深的层级
                            hideDeeperLevels(level + 2);
                        } catch (error) {
                            console.error('加载外部JSON文件失败:', error);
                            renderNavLevel(level + 1, [], item.name);
                        }
                    } else {
                        // 没有下一层级，隐藏更深层级
                        hideDeeperLevels(level + 1);
                    }
                   
                    // 显示故障列表
                    renderFaultList(item);
                });
               
                navLevel.appendChild(itemElement);
            });
           
            // 显示当前层级
            navLevel.style.display = 'block';
        }
       
        // 获取层级标题
        function getLevelTitle(level) {
            const titles = ['分类', '子分类', '子子分类', '子子子分类', '子子子子分类'];
            return titles[level - 1] || `层级 ${level}`;
        }
       
        // 隐藏更深层级的导航
        function hideDeeperLevels(startLevel) {
            let level = startLevel;
            while (true) {
                const navLevel = document.getElementById(`nav-level-${level}`);
                if (!navLevel) break;
                navLevel.style.display = 'none';
                level++;
            }
        }
       
        // 更新当前路径
        function updateCurrentPath(level, item) {
            // 截断路径到当前层级
            currentState.path = currentState.path.slice(0, level - 1);
           
            // 添加当前项到路径
            currentState.path.push({
                type: getLevelTitle(level).replace('分类', '').trim() || 'category',
                id: item.name,
                data: item
            });
           
            currentState.fault = null;
            currentState.searchMode = false;
        }
       
        // 更新面包屑导航
        function updateBreadcrumb() {
            const breadcrumb = document.getElementById('breadcrumb');
            breadcrumb.innerHTML = '';
           
            // 首页
            const homeItem = document.createElement('div');
            homeItem.className = 'breadcrumb-item';
            homeItem.textContent = '首页';
            homeItem.onclick = () => {
                currentState.path = [];
                currentState.fault = null;
                currentState.searchMode = false;
                renderNavLevel(1, jsonDataCache['root'].categories || []);
                hideDeeperLevels(2);
                renderFaultList();
            };
            breadcrumb.appendChild(homeItem);
           
            // 添加路径项
            currentState.path.forEach((pathItem, index) => {
                const crumbItem = document.createElement('div');
                crumbItem.className = 'breadcrumb-item';
                crumbItem.textContent = pathItem.id;
               
                crumbItem.onclick = () => {
                    // 截断路径
                    currentState.path = currentState.path.slice(0, index + 1);
                    currentState.fault = null;
                    currentState.searchMode = false;
                   
                    // 重新渲染导航
                    if (index === 0) {
                        renderNavLevel(1, jsonDataCache['root'].categories || []);
                        hideDeeperLevels(2);
                    } else {
                        // 获取父级数据
                        const parentData = currentState.path[index - 1].data;
                       
                        // 确定当前层级的数据
                        let currentLevelItems = [];
                        if (parentData.subcategories) {
                            currentLevelItems = parentData.subcategories;
                        } else if (parentData.ssubcategories) {
                            currentLevelItems = parentData.ssubcategories;
                        } else if (parentData.children) {
                            currentLevelItems = parentData.children;
                        }
                       
                        renderNavLevel(index + 1, currentLevelItems, parentData.name);
                        hideDeeperLevels(index + 2);
                    }
                   
                    // 显示故障列表
                    renderFaultList(pathItem.data);
                };
               
                breadcrumb.appendChild(crumbItem);
            });
        }
       
        // 显示注意事项（如果有）
        function showNoticeIfAvailable() {
            const noticePanel = document.getElementById('notice-panel');
            const noticeContent = document.getElementById('notice-content');
           
            // 从当前路径中查找最近的注意事项
            let notice = null;
            for (let i = currentState.path.length - 1; i >= 0; i--) {
                if (currentState.path[i].data.notice) {
                    notice = currentState.path[i].data.notice;
                    break;
                }
            }
           
            if (notice) {
                noticePanel.style.display = 'block';
                noticeContent.innerHTML = notice;
            } else {
                noticePanel.style.display = 'none';
            }
        }
       
        // 渲染故障列表
        function renderFaultList(currentItem = null) {
            const faultList = document.getElementById('fault-list');
           
            // 获取当前故障列表
            let faults = [];
            let currentData = currentItem;
           
            if (!currentData && currentState.path.length > 0) {
                currentData = currentState.path[currentState.path.length - 1].data;
            }
           
            if (currentData) {
                if (currentData.faults) {
                    faults = currentData.faults;
                } else if (currentData.items) {
                    faults = currentData.items;
                }
            }
           
            if (faults.length === 0) {
                faultList.innerHTML = `
                    <div class="empty-message">
                        <h3>当前分类下没有故障信息</h3>
                        <p>请选择其他分类或使用搜索功能。</p>
                    </div>
                `;
                document.getElementById('fault-details').style.display = 'none';
                return;
            }
           
            // 清空列表
            faultList.innerHTML = '';
           
            // 渲染故障列表
            faults.forEach(fault => {
                const item = document.createElement('div');
                item.className = 'fault-item';
                item.innerHTML = `
                    <div class="fault-code">${fault.code || ''}</div>
                    <div class="fault-title">${fault.title || fault.name || ''}</div>
                    ${fault.severity ? `<div class="fault-severity ${getSeverityClass(fault.severity)}">${fault.severity}</div>` : ''}
                `;
               
                item.addEventListener('click', () => {
                    // 高亮当前故障
                    document.querySelectorAll('.fault-item').forEach(i => {
                        i.classList.remove('active');
                    });
                    item.classList.add('active');
                   
                    // 显示故障详情
                    renderFaultDetails(fault);
                });
               
                faultList.appendChild(item);
            });
           
            // 默认显示第一个故障详情
            if (faults.length > 0) {
                document.querySelector('.fault-item').classList.add('active');
                renderFaultDetails(faults[0]);
            }
        }
       
        // 获取严重程度样式类
        function getSeverityClass(severity) {
            if (!severity) return '';
           
            switch (severity.toLowerCase()) {
                case '高': return 'severity-high';
                case '中': return 'severity-medium';
                case '低': return 'severity-low';
                default: return '';
            }
        }
       
        // 渲染故障详情
        function renderFaultDetails(fault) {
            const faultDetails = document.getElementById('fault-details');
            faultDetails.style.display = 'block';
           
            let detailsHtml = `
                <div class="fault-header">
                    <div class="fault-code">${fault.code || '无代码'}</div>
                    <div class="fault-title">${fault.title || fault.name || '无标题'}</div>
                    ${fault.severity ? `<div class="fault-severity ${getSeverityClass(fault.severity)}">严重程度: ${fault.severity}</div>` : ''}
                </div>
            `;
           
            if (fault.description) {
                detailsHtml += `
                    <div class="section">
                        <h3>问题描述</h3>
                        <p>${fault.description}</p>
                    </div>
                `;
            }
           
            if (fault.symptoms && fault.symptoms.length > 0) {
                detailsHtml += `
                    <div class="section">
                        <h3>症状</h3>
                        <ul>
                            ${fault.symptoms.map(symptom => `<li>${symptom}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }
           
            if (fault.causes && fault.causes.length > 0) {
                detailsHtml += `
                    <div class="section">
                        <h3>可能原因</h3>
                        <ul>
                            ${fault.causes.map(cause => `<li>${cause}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }
           
            if (fault.solutions && fault.solutions.length > 0) {
                detailsHtml += `
                    <div class="section">
                        <h3>解决方案</h3>
                        <ul>
                            ${fault.solutions.map(solution => {
                                if (typeof solution === 'string') {
                                    return `<li>${solution}</li>`;
                                } else {
                                    return `
                                        <li>
                                            <strong>${solution.title}:</strong>
                                            <div class="code-block">${solution.content}</div>
                                        </li>
                                    `;
                                }
                            }).join('')}
                        </ul>
                    </div>
                `;
            }
           
            if (fault.prevention && fault.prevention.length > 0) {
                detailsHtml += `
                    <div class="section">
                        <h3>预防措施</h3>
                        <ul>
                            ${fault.prevention.map(prevention => `<li>${prevention}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }
           
            faultDetails.innerHTML = detailsHtml;
        }
       
        // 初始化搜索功能
        function initSearch() {
            const searchInput = document.getElementById('search-input');
            const searchBtn = document.getElementById('search-btn');
            const resetBtn = document.getElementById('reset-btn');
           
            searchBtn.addEventListener('click', performSearch);
            resetBtn.addEventListener('click', resetSearch);
            searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    performSearch();
                }
            });
        }
       
        // 执行搜索
        function performSearch() {
            const query = document.getElementById('search-input').value.trim().toLowerCase();
           
            if (!query) {
                resetSearch();
                return;
            }
           
            // 设置搜索模式
            currentState.searchMode = true;
           
            // 在所有分类中搜索匹配的内容
            const results = searchInData(jsonDataCache['root'], query);
           
            // 更新视图显示搜索结果
            renderSearchResults(results, query);
        }
       
        // 在数据中搜索
        function searchInData(data, query, path = [], results = []) {
            if (!data) return results;
           
            // 检查当前数据是否匹配
            let matched = false;
           
            // 检查分类名称
            if (data.name && data.name.toLowerCase().includes(query)) {
                matched = true;
            }
           
            // 检查故障信息
            if (data.faults) {
                data.faults.forEach(fault => {
                    if (matchesFaultQuery(fault, query)) {
                        matched = true;
                    }
                });
            }
           
            // 检查注意事项
            if (data.notice && data.notice.toLowerCase().includes(query)) {
                matched = true;
            }
           
            // 如果匹配，添加到结果
            if (matched) {
                results.push({
                    data: data,
                    path: [...path, { type: 'category', id: data.name, data: data }]
                });
            }
           
            // 递归搜索子分类
            if (data.categories) {
                data.categories.forEach(category => {
                    searchInData(category, query, [...path, { type: 'category', id: data.name, data: data }], results);
                });
            }
           
            if (data.subcategories) {
                data.subcategories.forEach(subcategory => {
                    searchInData(subcategory, query, [...path, { type: 'subcategory', id: data.name, data: data }], results);
                });
            }
           
            if (data.ssubcategories) {
                data.ssubcategories.forEach(ssubcategory => {
                    searchInData(ssubcategory, query, [...path, { type: 'ssubcategory', id: data.name, data: data }], results);
                });
            }
           
            if (data.children) {
                data.children.forEach(child => {
                    searchInData(child, query, [...path, { type: 'child', id: data.name, data: data }], results);
                });
            }
           
            return results;
        }
       
        // 检查故障是否匹配查询
        function matchesFaultQuery(fault, query) {
            return (
                (fault.code && fault.code.toLowerCase().includes(query)) ||
                (fault.title && fault.title.toLowerCase().includes(query)) ||
                (fault.name && fault.name.toLowerCase().includes(query)) ||
                (fault.description && fault.description.toLowerCase().includes(query)) ||
                (fault.symptoms && fault.symptoms.some(s => s.toLowerCase().includes(query))) ||
                (fault.causes && fault.causes.some(c => c.toLowerCase().includes(query)))
            );
        }
       
        // 渲染搜索结果
        function renderSearchResults(results, query) {
            const faultList = document.getElementById('fault-list');
            faultList.innerHTML = '';
           
            if (results.length === 0) {
                faultList.innerHTML = `
                    <div class="empty-message">
                        <h3>未找到匹配的故障</h3>
                        <p>请尝试其他关键词。</p>
                    </div>
                `;
                document.getElementById('fault-details').style.display = 'none';
                return;
            }
           
            // 显示搜索结果
            results.forEach(result => {
                const item = document.createElement('div');
                item.className = 'fault-item';
               
                // 高亮匹配的文本
                let displayName = result.data.name;
                if (query && displayName.toLowerCase().includes(query)) {
                    const startIdx = displayName.toLowerCase().indexOf(query);
                    const endIdx = startIdx + query.length;
                    displayName =
                        displayName.substring(0, startIdx) +
                        `<span class="search-highlight">${displayName.substring(startIdx, endIdx)}</span>` +
                        displayName.substring(endIdx);
                }
               
                item.innerHTML = `
                    <div class="fault-title">${displayName}</div>
                    <div style="font-size: 0.9rem; color: #666; margin-top: 5px;">
                        ${result.path.map(p => p.id).join(' › ')}
                    </div>
                `;
               
                item.addEventListener('click', () => {
                    // 更新当前路径
                    currentState.path = result.path;
                    currentState.fault = null;
                    currentState.searchMode = false;
                   
                    // 更新面包屑
                    updateBreadcrumb();
                   
                    // 显示注意事项
                    showNoticeIfAvailable();
                   
                    // 渲染导航层级
                    renderNavLevelsFromPath(result.path);
                   
                    // 显示故障列表
                    renderFaultList(result.data);
                });
               
                faultList.appendChild(item);
            });
           
            // 隐藏故障详情
            document.getElementById('fault-details').style.display = 'none';
        }
       
        // 根据路径渲染导航层级
        function renderNavLevelsFromPath(path) {
            // 清空所有导航层级
            const navPanel = document.querySelector('.nav-panel');
            navPanel.innerHTML = '';
           
            // 重新创建导航层级
            path.forEach((pathItem, index) => {
                const level = index + 1;
               
                // 创建导航层级
                const navLevel = document.createElement('div');
                navLevel.className = 'nav-level';
                navLevel.id = `nav-level-${level}`;
                navLevel.innerHTML = `<div class="nav-level-title">${getLevelTitle(level)}</div>`;
               
                // 获取当前层级的项目
                let items = [];
                if (level === 1) {
                    items = jsonDataCache['root'].categories || [];
                } else {
                    const parentData = path[index - 1].data;
                    if (parentData.subcategories) {
                        items = parentData.subcategories;
                    } else if (parentData.ssubcategories) {
                        items = parentData.ssubcategories;
                    } else if (parentData.children) {
                        items = parentData.children;
                    }
                }
               
                // 渲染项目
                items.forEach(item => {
                    const itemElement = document.createElement('div');
                    itemElement.className = 'nav-item';
                    if (item.name === pathItem.id) {
                        itemElement.classList.add('active');
                    }
                    itemElement.dataset.id = item.name;
                    itemElement.dataset.parentId = level > 1 ? path[index - 1].data.name : null;
                   
                    // 添加图标
                    const icon = document.createElement('span');
                    icon.className = 'nav-item-icon';
                    icon.innerHTML = '📁';
                    itemElement.appendChild(icon);
                   
                    // 添加文本
                    const text = document.createElement('span');
                    text.textContent = item.name;
                    itemElement.appendChild(text);
                   
                    // 点击事件
                    itemElement.addEventListener('click', async () => {
                        // 更新当前路径
                        updateCurrentPath(level, item);
                       
                        // 更新面包屑
                        updateBreadcrumb();
                       
                        // 显示注意事项（如果有）
                        showNoticeIfAvailable();
                       
                        // 检查是否有下一层级
                        if (item.subcategories || item.ssubcategories || item.children) {
                            // 确定下一层级的数据
                            let nextLevelItems = [];
                            if (item.subcategories) {
                                nextLevelItems = item.subcategories;
                            } else if (item.ssubcategories) {
                                nextLevelItems = item.ssubcategories;
                            } else if (item.children) {
                                nextLevelItems = item.children;
                            }
                           
                            // 渲染下一层级
                            renderNavLevel(level + 1, nextLevelItems, item.name);
                        } else if (item.file) {
                            // 如果有file属性，表示需要加载外部JSON文件
                            try {
                                // 检查缓存
                                if (!jsonDataCache[item.file]) {
                                    const response = await fetch(`data/${item.file}`);
                                    if (!response.ok) throw new Error('加载失败');
                                    jsonDataCache[item.file] = await response.json();
                                }
                               
                                const fileData = jsonDataCache[item.file];
                               
                                // 渲染下一层级
                                renderNavLevel(level + 1, fileData.categories || fileData.subcategories || fileData.children, item.name);
                            } catch (error) {
                                console.error('加载外部JSON文件失败:', error);
                                renderNavLevel(level + 1, [], item.name);
                            }
                        }
                       
                        // 显示故障列表
                        renderFaultList(item);
                    });
                   
                    navLevel.appendChild(itemElement);
                });
               
                navPanel.appendChild(navLevel);
            });
        }
       
        // 重置搜索
        function resetSearch() {
            document.getElementById('search-input').value = '';
           
            if (currentState.searchMode) {
                currentState.searchMode = false;
               
                // 如果之前有路径，恢复到该路径
                if (currentState.path.length > 0) {
                    // 更新面包屑
                    updateBreadcrumb();
                   
                    // 显示注意事项
                    showNoticeIfAvailable();
                   
                    // 渲染导航层级
                    renderNavLevelsFromPath(currentState.path);
                   
                    // 显示故障列表
                    renderFaultList(currentState.path[currentState.path.length - 1].data);
                } else {
                    // 恢复到初始状态
                    renderNavLevel(1, jsonDataCache['root'].categories || []);
                    hideDeeperLevels(2);
                    renderFaultList();
                }
            }
        }
