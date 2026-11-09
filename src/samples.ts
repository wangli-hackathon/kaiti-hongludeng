export interface Sample {
  id: string;
  discipline: string;
  title: string;
  blurb: string;
  question: string;
  abstract: string;
  references: string;
}

export const SAMPLES: Sample[] = [
  {
    id: "short-video",
    discipline: "教育技术",
    title: "短视频与深度学习",
    blurb: "问题清楚，但把因果问成了问卷。适合看黄灯怎么说话。",
    question: "短视频使用是否会降低普通高校大学生的深度学习投入？",
    abstract:
      "现有研究多讨论使用时长，较少把深度学习投入（整合、批判、迁移）从表面学习里拆出来。本研究计划在一所省属本科高校抽取约 280 名大二、大三学生，用问卷测量近一周短视频使用时长、使用动机和深度学习投入，并做相关与回归分析。预期给辅导员提供使用建议。研究在一学期内完成。",
    references: `王小明, 李华. 大学生短视频使用与学习投入的关系[J]. 现代教育技术, 2022, 32(4): 45-52.
Zhang L, Chen Y. Short-form video and college learning[J]. Computers and Education, 2024, 210: 104890.
周婷. 移动学习中的认知负荷[M]. 北京: 教育科学出版社, 2014.
OECD. PISA 2022 Results[R]. Paris: OECD, 2023.
陈磊. 算法推荐对注意持续的影响[J]. 开放教育研究, 2021, 27(6): 88-97.
刘洋. 新媒体与大学生[J]. 教育研究, 2009(3): 12-18.`,
  },
  {
    id: "github-review",
    discipline: "软件工程",
    title: "GitHub 评审与缺陷",
    blurb: "公开数据、观察设计、范围写死。适合看一份能谈的开题。",
    question: "在公开的 GitHub Pull Request 中，改动行数与评审评论里指出的缺陷条数是否相关？",
    abstract:
      "不同于用主观打分测量代码评审质量的研究，本文只使用 GitHub 公开数据。计划从 2023 至 2024 年 star 数大于 1000 的 30 个 Python 仓库中抽取已合并的 Pull Request，用改动行数作观察变量，用评审评论中缺陷类语句的人工编码作结果。不做因果推断。单人可在八周内完成编码手册，并先编码 80 条看一致度。数据公开可下载，不涉及私人通信。",
    references: `Bacchelli A, Bird C. Expectations, outcomes, and challenges of modern code review[C]. ICSE, 2013.
Rigby P, Bird C. Convergent contemporary software peer review practices[C]. FSE, 2013.
Sadowski C, Soderberg E, Church L, Sipko M, Bacchelli A. Modern code review: a case study at Google[C]. ICSE, 2018.
Thongtanunam P, McIntosh S, Hassan A, Iida H. Investigating code review practices in defective files[C]. MSR, 2015.
Wessel M, Serebrenik A, Wiese I, Steinmacher I, Gerosa M. Quality gatekeepers: investigating code review bots[J]. TSE, 2022.
Hirao T, McIntosh S, Ihara A, Matsumoto K. Code review comment types[J]. Empirical Software Engineering, 2024.
刘泽. 开源社区评审意见分类[J]. 软件学报, 2023, 34(8): 1-15.`,
  },
  {
    id: "elder-health",
    discipline: "公共卫生",
    title: "农村老年健康",
    blurb: "口号、病历、全国推广和两周工期叠在一起。适合看红灯。",
    question: "关于农村老年人健康的一些相关研究",
    abstract:
      "希望探讨数字化如何赋能农村老年健康，最好能做全国追踪，开发一个小程序并在医院推广。也可以访谈一些老人和医生，用到他们的病历会更准确。创新点是比较综合。时间上想在两周内出成果。",
    references: "李强. 农村卫生[M]. 北京: 卫生出版社, 1998.",
  },
];
