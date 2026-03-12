鉴于在项目初始情况下kimi code对openspec的理解可能会有偏差，我基于kimi code+openspec开发系统，需要创建个名为kimi-openspec-init的skill,
以实现如下目的：
1.让kimi code充分理解openspec规范；
2.根据openspec对TRAE初始化结果，实现在kimi code中建立相关openspec的skill;
3.根据项目需求和设计，初始化相关的是三个项目级规范文件.AGENTS.md,./openspec/constitution.md,./agents/skills/project-rule/SKILL.md
 
skill执行前依赖
1.检查是否有openspec init对TRAE的初始化生成skill，目录一般为./.trae/skills中以openspec-*开头的;
2.检查目录已经进行了kimi code的/init指令，存在.AGENTS.md和./agent/目录（或./.kimi/目录）
3.在./doc/prompt/目录下存在项目目标文件project_target.md

skill内容要求：
1. 说清楚openspec是的主要概念(change,poposal,design,task,spec)和参考((https://github.com/Fission-AI/OpenSpec)；
2. 基于openspec init对TRAE的初始化生成skill, 然后拷贝这些skill（./.trae/skills中以openspec-*开头的）作为kimi code自己的skill; 
3. 参考./doc/project_target.md,参考其中项目目标、技术要求、功能要求，初始化相关的是三个项目级规范文件.AGENTS.md,./openspec/constitution.md,./agents/skills/project-rule/SKILL.md；
4. 检查kimi code正确理解了opespec概念，并能准确调用项目openspec的skill;
5. 检查三个项目级别的规范文件.AGENTS.md,./openspec/constitution.md,./agents/skills/project-rule/SKILL.md 内容中职责分工合理，描述不冲突，符合项目目标；