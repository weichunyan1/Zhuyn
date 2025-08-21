
        // DOM元素
        const targetCharacter = document.querySelector('.target-character');
        const characterDisplay = document.getElementById('characterDisplay');
        const optionsContainer = document.getElementById('optionsContainer');
        const feedback = document.getElementById('feedback');
        const startBtn = document.getElementById('startBtn');
        const nextBtn = document.getElementById('nextBtn');
        const exportBtn = document.getElementById('exportBtn');
        const scoreElement = document.getElementById('score');
        const correctElement = document.getElementById('correct');
        const totalElement = document.getElementById('total');
        const counter = document.querySelector('.counter');
        const celebration = document.getElementById('celebration');
        const reportContainer = document.getElementById('reportContainer');
        const reportItems = document.getElementById('reportItems');
        const closeReport = document.getElementById('closeReport');
        const fileInput = document.getElementById('fileInput');
        const timeOptions = document.querySelectorAll('.time-option');
        const presetFileSelect = document.getElementById('presetFileSelect');
        const presetStatus = document.getElementById('presetStatus');
        
        // 游戏变量
        let characterGroups = [];
        let currentGroup = null;
        let currentTarget = null;
        let score = 0;
        let correctCount = 0;
        let totalCount = 0;
        let streak = 0;
        let gameActive = false;
        let questionsInRound = 0;
        let totalQuestions = 0; // 总题数（由字组数决定）
        let usedGroupIndexes = []; // 已出过的字组索引，确保一组只出一次
        let autoNextTimeout = null; // 自动跳题定时器
        let countdownRafId = null; // rAF计时器ID
        let countdownEndTime = 0; // 倒计时结束时间戳（ms）
        let userSelection = null;
        let isCorrect = false;
        let answerHistory = [];
        let memoryTime = 1; // 默认记忆时间改为1秒
        let timeOptionsEnabled = true; // 控制时间选项是否可用
        let presetFileItems = [];
        
        // 初始化游戏
        function initGame() {
            if (characterGroups.length === 0) {
                feedback.textContent = "请先选择形近字库文件";
                feedback.className = "feedback incorrect";
                return false;
            }
            
            score = 0;
            correctCount = 0;
            totalCount = 0;
            streak = 0;
            questionsInRound = 0;
            answerHistory = [];
            usedGroupIndexes = [];
            totalQuestions = characterGroups.length; // 题量 = 字组数
            updateStats();
            feedback.textContent = "准备开始学习";
            feedback.className = "";
            targetCharacter.textContent = "?";
            counter.style.display = "none";
            nextBtn.disabled = true;
            exportBtn.disabled = true;
            reportContainer.classList.remove('show');
            optionsContainer.style.display = "none";
            characterDisplay.style.display = "flex";
            
            // 禁用时间选项
            timeOptionsEnabled = false;
            timeOptions.forEach(option => {
                option.classList.add('disabled');
            });
            
            // 清空选项
            optionsContainer.innerHTML = "";
            if (autoNextTimeout) {
                clearTimeout(autoNextTimeout);
                autoNextTimeout = null;
            }
            // 禁用导入文件，避免中途更换数据
            fileInput.disabled = true;
            
            return true;
        }
        
        // 开始新题目
        function startNewQuestion() {
            if (!gameActive || questionsInRound >= totalQuestions) {
                endGame();
                return;
            }
            
            // 随机选择一个未出过的字组
            const availableIndexes = characterGroups
                .map((_, idx) => idx)
                .filter(idx => !usedGroupIndexes.includes(idx));
            if (availableIndexes.length === 0) {
                endGame();
                return;
            }
            const randomGroupIndex = availableIndexes[Math.floor(Math.random() * availableIndexes.length)];
            usedGroupIndexes.push(randomGroupIndex);
            currentGroup = characterGroups[randomGroupIndex];
            
            // 从当前字组中随机选择一个目标字
            const randomCharIndex = Math.floor(Math.random() * currentGroup.options.length);
            currentTarget = currentGroup.options[randomCharIndex];
            
            // 显示目标字
            characterDisplay.style.display = "flex";
            targetCharacter.textContent = currentTarget;
            feedback.textContent = "请仔细观察并记住这个汉字";
            feedback.className = "";
            nextBtn.disabled = true;
            exportBtn.disabled = true;
            optionsContainer.style.display = "none";
            
            // 倒计时
            counter.style.display = "flex";
            const durationMs = memoryTime * 1000;
            countdownEndTime = performance.now() + durationMs;
            if (countdownRafId) {
                cancelAnimationFrame(countdownRafId);
                countdownRafId = null;
            }
            const tick = (now) => {
                // 若游戏已停止，终止渲染
                if (!gameActive) { countdownRafId = null; return; }
                const remainingSec = Math.max(0, (countdownEndTime - now) / 1000);
                // 钳制到[0, ∞)，避免-0.0
                counter.textContent = remainingSec.toFixed(1);
                if (remainingSec <= 0) {
                    counter.style.display = "none";
                    characterDisplay.style.display = "none";
                    countdownRafId = null;
                    showOptions();
                    return;
                }
                countdownRafId = requestAnimationFrame(tick);
            };
            countdownRafId = requestAnimationFrame(tick);
        }
        
        // 显示选项
        function showOptions() {
            feedback.textContent = "请选择刚才显示的汉字";
            questionsInRound++;
            
            // 清空选项容器
            optionsContainer.innerHTML = "";
            // 多选项时切换为网格布局
            if (currentGroup.options.length > 8) {
                optionsContainer.classList.add('grid-mode');
            } else {
                optionsContainer.classList.remove('grid-mode');
            }
            
            // 随机排序选项
            const shuffledOptions = [...currentGroup.options].sort(() => Math.random() - 0.5);
            
            // 创建选项元素
            shuffledOptions.forEach(char => {
                const option = document.createElement('div');
                option.className = 'option';
                option.textContent = char;
                option.dataset.value = char;
                option.addEventListener('click', handleOptionClick);
                optionsContainer.appendChild(option);
            });
            
            optionsContainer.style.display = "flex";
        }
        
        // 处理选项点击
        function handleOptionClick(e) {
            if (!gameActive) return;
            
            const selectedOption = e.target;
            const selectedValue = selectedOption.dataset.value;
            userSelection = selectedValue;
            
            // 禁用所有选项
            const options = optionsContainer.querySelectorAll('.option');
            options.forEach(option => {
                option.style.pointerEvents = "none";
            });
            
            totalCount++;
            
            // 检查答案
            if (selectedValue === currentTarget) {
                // 答对了
                feedback.textContent = "太棒了！答对了！";
                feedback.className = "feedback correct";
                selectedOption.style.background = "#c8e6c9";
                
                isCorrect = true;
                correctCount++;
                streak++;
                
                // 根据连续答对数量加分
                if (streak >= 3) {
                    score += 30;
                    feedback.textContent = `太厉害了！连续答对${streak}题 +30分！`;
                    createConfetti();
                } else if (streak >= 2) {
                    score += 20;
                    feedback.textContent = `连续答对${streak}题 +20分！`;
                } else {
                    score += 10;
                }
            } else {
                // 答错了
                feedback.textContent = `答错了，正确答案是：${currentTarget}`;
                feedback.className = "feedback incorrect";
                selectedOption.style.background = "#ffcdd2";
                
                // 高亮显示正确答案
                options.forEach(option => {
                    if (option.dataset.value === currentTarget) {
                        option.style.background = "#c8e6c9";
                    }
                });
                
                isCorrect = false;
                streak = 0;
            }
            
            // 记录答案
            answerHistory.push({
                target: currentTarget,
                group: currentGroup.group,
                selection: userSelection,
                correct: isCorrect
            });
            
            updateStats();
            nextBtn.disabled = false;
            exportBtn.disabled = false;
            // 自动跳到下一题：答对1秒，答错2秒
            if (autoNextTimeout) {
                clearTimeout(autoNextTimeout);
                autoNextTimeout = null;
            }
            const delay = isCorrect ? 1000 : 2000;
            autoNextTimeout = setTimeout(() => {
                if (gameActive && questionsInRound < totalQuestions) {
                    startNewQuestion();
                } else if (questionsInRound >= totalQuestions) {
                    endGame();
                }
            }, delay);
        }
        
        // 更新统计数据
        function updateStats() {
            scoreElement.textContent = score;
            correctElement.textContent = correctCount;
            // 已出题数
            totalElement.textContent = questionsInRound;
            // 总题数
            const totalQuestionsEl = document.getElementById('totalQuestions');
            if (totalQuestionsEl) totalQuestionsEl.textContent = totalQuestions;
        }
        
        // 创建庆祝效果
        function createConfetti() {
            celebration.style.opacity = "1";
            celebration.innerHTML = "";
            
            const colors = ['#ff5252', '#ff4081', '#e040fb', '#7c4dff', '#536dfe', '#448aff', '#40c4ff', '#18ffff', '#64ffda', '#69f0ae'];
            
            for (let i = 0; i < 80; i++) {
                const confetti = document.createElement('div');
                confetti.style.position = 'absolute';
                confetti.style.width = '10px';
                confetti.style.height = '10px';
                confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
                confetti.style.left = `${Math.random() * 100}%`;
                confetti.style.top = `${Math.random() * 100}%`;
                confetti.style.opacity = '0.8';
                confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
                confetti.style.animation = `fall ${Math.random() * 3 + 2}s linear forwards`;
                
                celebration.appendChild(confetti);
            }
            
            setTimeout(() => {
                celebration.style.opacity = "0";
                setTimeout(() => {
                    celebration.innerHTML = "";
                }, 2000);
            }, 3000);
        }
        
        // 显示报告
        function showReport() {
            reportItems.innerHTML = "";
            
            answerHistory.forEach(item => {
                const reportItem = document.createElement('div');
                reportItem.className = 'report-item';
                reportItem.innerHTML = `
                    <div>${item.target}</div>
                    <div>${item.group}</div>
                    <div>${item.selection}</div>
                    <div class="${item.correct ? 'correct-result' : 'incorrect-result'}">
                        ${item.correct ? '✓ 正确' : '✗ 错误'}
                    </div>
                `;
                reportItems.appendChild(reportItem);
            });
            
            reportContainer.classList.add('show');
        }
        
        // 导出报告
        function exportReport() {
            if (answerHistory.length === 0) {
                alert("没有可导出的学习记录");
                return;
            }
            
            // 生成时间戳
            const now = new Date();
            const timestamp = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
            
            // 创建报告内容
            let reportContent = `形近字学习报告\n`;
            reportContent += `生成时间: ${now.toLocaleString()}\n`;
            reportContent += `得分: ${score} | 正确: ${correctCount} | 总数: ${totalCount} | 正确率: ${Math.round((correctCount / totalCount) * 100)}%\n\n`;
            
            reportContent += "目标字\t字组\t您的选择\t结果\n";
            reportContent += "------\t----\t--------\t----\n";
            
            answerHistory.forEach(item => {
                reportContent += `${item.target}\t${item.group}\t${item.selection}\t${item.correct ? '正确' : '错误'}\n`;
            });
            
            // 创建下载链接
            const blob = new Blob([reportContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `形近字识别_${timestamp}.txt`;
            document.body.appendChild(a);
            a.click();
            
            // 清理
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        }
        
        // 结束游戏
        function endGame() {
            gameActive = false;
            startBtn.textContent = "开始学习";
            nextBtn.disabled = true;
            
            // 启用时间选项
            timeOptionsEnabled = true;
            timeOptions.forEach(option => {
                option.classList.remove('disabled');
            });
            if (autoNextTimeout) {
                clearTimeout(autoNextTimeout);
                autoNextTimeout = null;
            }
            if (countdownRafId) {
                cancelAnimationFrame(countdownRafId);
                countdownRafId = null;
            }
            // 恢复导入文件
            fileInput.disabled = false;
            // 若有作答记录，则允许导出报告；否则禁用
            exportBtn.disabled = (answerHistory.length === 0);
            
            if (questionsInRound >= totalQuestions) {
                const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
                feedback.innerHTML = `本轮学习完成！<br>得分：${score} | 正确率：${accuracy}%`;
                feedback.className = "feedback correct";
                createConfetti();
            }
            
            targetCharacter.textContent = "?";
            optionsContainer.style.display = "none";
            characterDisplay.style.display = "flex";
            
            showReport();
        }
        
        // 处理文件上传
        function handleFileUpload(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                const content = e.target.result;
                processFileContent(content);
            };
            reader.readAsText(file);
        }
        
        // 处理文件内容
        function processFileContent(content) {
            characterGroups = [];
            const lines = content.split('\n');
            
            lines.forEach(line => {
                line = line.trim();
                if (line) {
                    // 移除可能存在的数字序号和标点
                    const cleanLine = line.replace(/^[0-9\.\s、]+/, '');
                    const characters = cleanLine.split('').filter(c => c.trim() !== '');
                    
                    if (characters.length > 1) {
                        characterGroups.push({
                            group: characters.join(''),
                            options: characters
                        });
                    }
                }
            });
            
            if (characterGroups.length > 0) {
                feedback.textContent = `成功加载 ${characterGroups.length} 组形近字`;
                feedback.className = "feedback correct";
                startBtn.disabled = false;
                const totalQuestionsEl = document.getElementById('totalQuestions');
                if (totalQuestionsEl) totalQuestionsEl.textContent = characterGroups.length;
            } else {
                feedback.textContent = "文件格式不正确，请确保每行包含一组形近字";
                feedback.className = "feedback incorrect";
                startBtn.disabled = true;
                const totalQuestionsEl = document.getElementById('totalQuestions');
                if (totalQuestionsEl) totalQuestionsEl.textContent = 0;
            }
        }
        
        // 获取并刷新预设文件列表
        async function refreshPresetFiles() {
            if (!presetStatus) return;
            presetStatus.textContent = '正在加载预设列表…';
            try {
                const res = await fetch('file/files.json', { cache: 'no-store' });
                if (!res.ok) throw new Error(`读取失败(${res.status})`);
                const items = await res.json();
                presetFileItems = items.map(it => ({
                    name: it.name,
                    path: it.path || `file/${it.name}`
                }));
                // 填充下拉框
                if (presetFileSelect) {
                    presetFileSelect.innerHTML = '<option value="">-- 请选择预设信息库 --</option>';
                    presetFileItems.forEach((it, idx) => {
                        const opt = document.createElement('option');
                        opt.value = String(idx);
                        opt.textContent = it.name;
                        presetFileSelect.appendChild(opt);
                    });
                }
                presetStatus.textContent = `已加载 ${presetFileItems.length} 个预设`;
            } catch (e) {
                console.error(e);
                presetStatus.textContent = '无法加载预设列表，请稍后重试';
            }
        }
        
        // 从下拉选择加载预设
        async function loadPresetFromSelect() {
            if (!presetFileSelect) return;
            const idxStr = presetFileSelect.value;
            if (!idxStr) {
                feedback.textContent = "请先选择一个预设文件";
                feedback.className = "feedback incorrect";
                return;
            }
            const idx = parseInt(idxStr, 10);
            const item = presetFileItems[idx];
            if (!item) return;
            try {
                const res = await fetch(item.path, { cache: 'no-store' });
                if (!res.ok) throw new Error(`读取失败(${res.status})`);
                const content = await res.text();
                processFileContent(content);
                // 清空手动文件选择，避免混淆
                if (fileInput) fileInput.value = '';
                feedback.textContent = `已加载预设：${item.name}`;
                feedback.className = "feedback correct";
                startBtn.disabled = false;
            } catch (e) {
                console.error(e);
                feedback.textContent = `加载预设失败：${item.name}`;
                feedback.className = "feedback incorrect";
            }
        }
        
        // 设置记忆时间
        function setMemoryTime(time) {
            if (!timeOptionsEnabled) return; // 如果时间选项被禁用，则不执行
            
            memoryTime = parseFloat(time);
            
            // 更新UI
            timeOptions.forEach(option => {
                if (option.dataset.time === time) {
                    option.classList.add('active');
                } else {
                    option.classList.remove('active');
                }
            });
            
            // 更新计数器显示
            counter.textContent = memoryTime;
        }
        
        // 添加动态样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fall {
                0% {
                    transform: translateY(-100px) rotate(0deg);
                    opacity: 0.8;
                }
                100% {
                    transform: translateY(100vh) rotate(${Math.random() * 360}deg);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
        
        // 事件监听
        startBtn.addEventListener('click', () => {
            if (gameActive) {
                // 结束游戏
                gameActive = false;
                startBtn.textContent = "开始学习";
                feedback.textContent = "学习已结束";
                endGame();
            } else {
                // 开始游戏
                if (initGame()) {
                    gameActive = true;
                    startBtn.textContent = "结束学习";
                    startNewQuestion();
                }
            }
        });
        
        nextBtn.addEventListener('click', () => {
            if (autoNextTimeout) {
                clearTimeout(autoNextTimeout);
                autoNextTimeout = null;
            }
            if (gameActive && questionsInRound < totalQuestions) {
                startNewQuestion();
            } else if (questionsInRound >= totalQuestions) {
                endGame();
            }
        });
        
        exportBtn.addEventListener('click', exportReport);
        
        closeReport.addEventListener('click', () => {
            reportContainer.classList.remove('show');
        });
        
        fileInput.addEventListener('change', handleFileUpload);
        
        timeOptions.forEach(option => {
            option.addEventListener('click', () => {
                setMemoryTime(option.dataset.time);
            });
        });
        
        if (presetFileSelect) {
            presetFileSelect.addEventListener('change', () => {
                loadPresetFromSelect();
            });
        }
        
        // 初始化游戏
        initGame();
        startBtn.disabled = true;
        // 加载预设列表（用于移动端快速使用）
        refreshPresetFiles();
   