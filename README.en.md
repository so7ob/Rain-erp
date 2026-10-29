# Rain-erp

[العربية](README.md) | **English**

Development and release policy: [contributing guide](CONTRIBUTING.md) · [workflow details](docs/development-workflow.md).

**Rain-erp** is a product of **[so7ob-tech — سحب التقنية](https://github.com/so7ob-tech)**, providing a platform for business management and enterprise resource planning.

> **so7ob-tech — Raining smart solutions.**

The platform is based on the open source **Yudao / ruoyi-vue-pro** project. This English guide preserves the upstream references, diagrams, and interface screenshots.

The demo links, documentation, and edition branches below belong to the upstream project and may contain Chinese content. Translating this file does not change the application's interface language.

This repository targets **Java 17** and **Spring Boot 3.5.15**, as configured in [pom.xml](pom.xml). System management and infrastructure are enabled by default alongside the framework and server; other business modules remain optional in the build configuration.

<p align="center">
 <img src="https://img.shields.io/badge/Spring%20Boot-3.5.15-blue.svg" alt="Spring Boot 3.5.15">
 <img src="https://img.shields.io/badge/Vue-3.2-blue.svg" alt="Vue 3.2">
 <img src="https://img.shields.io/github/license/YunaiV/ruoyi-vue-pro" alt="MIT License" />
</p>

If you find the project useful, consider giving it a star and following its updates.

## Getting started

* Demo with Vue3 and Element Plus: <http://dashboard-vue3.yudao.iocoder.cn>
* Demo with Vue3, Vben, and Ant Design Vue: <http://dashboard-vben.yudao.iocoder.cn>
* Demo with Vue2 and Element UI: <http://dashboard.yudao.iocoder.cn>
* Startup guide: <https://doc.iocoder.cn/quick-start/>
* Video tutorials: <https://doc.iocoder.cn/video/>

## Upstream editions

| Edition | JDK 8 + Spring Boot 2.7 | JDK 17/21 + Spring Boot 3.5 | JDK 25 + Spring Boot 4.x |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Full edition: [ruoyi-vue-pro](https://gitee.com/zhijiantianya/ruoyi-vue-pro) | [`master`](https://gitee.com/zhijiantianya/ruoyi-vue-pro/tree/master/) branch | [`master-jdk17`](https://gitee.com/zhijiantianya/ruoyi-vue-pro/tree/master-jdk17/) branch | [`master-jdk25`](https://gitee.com/zhijiantianya/ruoyi-vue-pro/tree/master-jdk25/) branch |
| Minimal edition: [yudao-boot-mini](https://gitee.com/yudaocode/yudao-boot-mini) | [`master`](https://gitee.com/yudaocode/yudao-boot-mini/tree/master/) branch | [`master-jdk17`](https://gitee.com/yudaocode/yudao-boot-mini/tree/master-jdk17/) branch | [`master-jdk25`](https://gitee.com/yudaocode/yudao-boot-mini/tree/master-jdk25/) branch |

* **Full edition:** Includes system management, infrastructure, workflows, payments, reports, WeChat Official Accounts, the online store, member management, ERP, WMS, CRM, MES, HRM, FMS, PMS, OA, AI models, IoT, and instant messaging.
* **Minimal edition:** Includes only system management and infrastructure, without the other business modules listed for the full edition.

The [module migration guide](https://doc.iocoder.cn/migrate-module/) explains how to move selected modules from the full edition to the minimal edition. The upstream guide estimates 5–10 minutes for this process.

## Platform overview

**Rain-erp** is a platform by **so7ob-tech (سحب التقنية)** for business management and rapid application development, based on **Yudao / ruoyi-vue-pro** and available to individuals and organizations under the included MIT License.

> Use the relevant repository's _Issues_ section to report problems or request features.
>
> Giving the project a star is one way to support its maintainers.

![Architecture diagram](/.image/common/ruoyi-vue-pro-architecture.png)

* Upstream Java backend: `master` uses JDK 8 with Spring Boot 2.7; `master-jdk17` uses JDK 17/21 with Spring Boot 3.5; `master-jdk25` uses JDK 25 with Spring Boot 4.x.
* Web administration: two Vue3 variants using `element-plus` or `vben(ant-design-vue)`, plus a Vue2 variant using `element-ui`.
* Mobile administration: uses `uni-app` to share one codebase across mobile apps, mini programs, and H5 web clients.
* The backend uses a modular Spring Boot architecture with MySQL, MyBatis Plus, Redis, and Redisson.
* Database options include MySQL, Oracle, PostgreSQL, SQL Server, MariaDB, DM, KingbaseES, HighGo, and others. See [compatibility and database support](#database-support).
* Messaging and event options include Event, Redis, RabbitMQ, Kafka, and RocketMQ.
* Authentication uses Spring Security, tokens, and Redis, supporting multiple user types, devices, and single sign-on (SSO).
* Dynamic permission menus, button-level access control, and Redis caching improve authorization flexibility and performance.
* SaaS multi-tenancy supports tenant-specific permissions and tenant isolation at the infrastructure layer.
* Workflows use Flowable, with dynamic forms, visual design, all-approver or any-approver approval, and multiple task assignment strategies.
* The code generator creates Java and Vue code, SQL scripts, and API documentation for single tables, tree structures, and master-detail relationships.
* Real-time communication uses Spring WebSocket, with token authentication and WebSocket cluster support.
* Third-party login integrates with WeChat mini programs, WeChat Official Accounts, WeCom, and DingTalk. Payments and refunds integrate with Alipay and WeChat.
* SMS integrations include Alibaba Cloud and Tencent Cloud. Storage integrations include MinIO, Alibaba Cloud, Tencent Cloud, and Qiniu Cloud.
* Report and dashboard designers support drag-and-drop authoring.

<a id="database-support"></a>

## Compatibility and database support

The project supports operating systems, databases, and middleware from the Chinese technology ecosystem for deployment in Xinchuang environments:

| Category | Supported options | Notes |
| ---------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Chinese operating systems | Linux distributions such as Kylin and UnionTech UOS | See [Linux deployment](https://doc.iocoder.cn/deployment-linux/) and select a JDK matching the CPU architecture. |
| Relational databases | MySQL, MariaDB, Oracle, PostgreSQL, SQL Server | MySQL is the default. |
| Chinese relational databases | DM, KingbaseES, openGauss, HighGo, OceanBase, TiDB, Huawei GaussDB, MogDB, Vastbase G100, PolarDB, Shentong | See [Xinchuang databases](https://doc.iocoder.cn/xinchuang-db/). |
| Chinese cache systems | TongRDS, BES CacheDB | Redis alternatives; see [Xinchuang databases](https://doc.iocoder.cn/xinchuang-db/). |
| Chinese application servers | TongWeb, BES AppServer | Tomcat alternatives; see [TongWeb deployment](https://doc.iocoder.cn/deployment-tong/) and [BES deployment](https://doc.iocoder.cn/deployment-bes/). |
| Chinese web servers | TongHttpServer | An Nginx alternative for static files and reverse proxying; see [TongWeb deployment](https://doc.iocoder.cn/deployment-tong/). |

* The [`sql`](sql/) directory provides initialization scripts, including Quartz, for MySQL, Oracle, PostgreSQL, SQL Server, DM, KingbaseES, openGauss, HighGo, and OceanBase. Prefer the matching database directory. MariaDB and TiDB use MySQL scripts directly; GaussDB, MogDB, and Vastbase G100 use openGauss scripts; PolarDB's PostgreSQL edition uses PostgreSQL scripts. Shentong requires adapting the openGauss scripts, including Quartz, according to the [guide](https://doc.iocoder.cn/xinchuang-db/#_9-神通数据库) before import.
* For other databases or later schema changes, see the conversion tools in [`sql/tools`](sql/tools/README.md) and the [schema changes and version upgrades guide](https://doc.iocoder.cn/sql-update/#_3-数据库转换). Review and test converted scripts against the target database.

## Related projects

![Architecture evolution](/.image/common/yudao-roadmap.png)

A community-maintained [comparison of Chinese open source projects](https://www.yuque.com/xiatian-bsgny/lm0ec1/wqf8mn) compares the features of these three projects.

### Backend projects

| Project | Stars | Description |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| [ruoyi-vue-pro](https://gitee.com/zhijiantianya/ruoyi-vue-pro) | [![Gitee stars](https://gitee.com/zhijiantianya/ruoyi-vue-pro/badge/star.svg?theme=white)](https://gitee.com/zhijiantianya/ruoyi-vue-pro) [![GitHub stars](https://img.shields.io/github/stars/YunaiV/ruoyi-vue-pro.svg?style=social&label=Stars)](https://github.com/YunaiV/ruoyi-vue-pro) | Modular Spring Boot architecture. |
| [yudao-cloud](https://gitee.com/zhijiantianya/yudao-cloud) | [![Gitee stars](https://gitee.com/zhijiantianya/yudao-cloud/badge/star.svg?theme=white)](https://gitee.com/zhijiantianya/yudao-cloud) [![GitHub stars](https://img.shields.io/github/stars/YunaiV/yudao-cloud.svg?style=social&label=Stars)](https://github.com/YunaiV/yudao-cloud) | Spring Cloud microservices architecture. |
| [Spring-Boot-Labs](https://gitee.com/yudaocode/SpringBoot-Labs) | [![Gitee stars](https://gitee.com/yudaocode/SpringBoot-Labs/badge/star.svg?theme=white)](https://gitee.com/zhijiantianya/yudao-cloud) [![GitHub stars](https://img.shields.io/github/stars/yudaocode/SpringBoot-Labs.svg?style=social&label=Stars)](https://github.com/yudaocode/SpringBoot-Labs) | Structured tutorials for Spring Boot and Spring Cloud. |

### Frontend projects

| Project | Stars | Description |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| [yudao-ui-admin-vue3](https://gitee.com/yudaocode/yudao-ui-admin-vue3) | [![Gitee stars](https://gitee.com/yudaocode/yudao-ui-admin-vue3/badge/star.svg?theme=white)](https://gitee.com/yudaocode/yudao-ui-admin-vue3) [![GitHub stars](https://img.shields.io/github/stars/yudaocode/yudao-ui-admin-vue3.svg?style=social&label=Stars)](https://github.com/yudaocode/yudao-ui-admin-vue3) | Administration UI built with Vue3 and Element Plus. |
| [yudao-ui-admin-vben](https://gitee.com/yudaocode/yudao-ui-admin-vben) | [![Gitee stars](https://gitee.com/yudaocode/yudao-ui-admin-vben/badge/star.svg?theme=white)](https://gitee.com/yudaocode/yudao-ui-admin-vben) [![GitHub stars](https://img.shields.io/github/stars/yudaocode/yudao-ui-admin-vben.svg?style=social&label=Stars)](https://github.com/yudaocode/yudao-ui-admin-vben) | Administration UI built with Vue3, Vben, and Ant Design Vue. |
| [yudao-mall-uniapp](https://gitee.com/yudaocode/yudao-mall-uniapp) | [![Gitee stars](https://gitee.com/yudaocode/yudao-mall-uniapp/badge/star.svg?theme=white)](https://gitee.com/yudaocode/yudao-mall-uniapp) [![GitHub stars](https://img.shields.io/github/stars/yudaocode/yudao-mall-uniapp.svg?style=social&label=Stars)](https://github.com/yudaocode/yudao-mall-uniapp) | Store mini program built with uni-app. |
| [yudao-ui-admin-vue2](https://gitee.com/yudaocode/yudao-ui-admin-vue2) | [![Gitee stars](https://gitee.com/yudaocode/yudao-ui-admin-vue2/badge/star.svg?theme=white)](https://gitee.com/yudaocode/yudao-ui-admin-vue2) [![GitHub stars](https://img.shields.io/github/stars/yudaocode/yudao-ui-admin-vue2.svg?style=social&label=Stars)](https://github.com/yudaocode/yudao-ui-admin-vue2) | Administration UI built with Vue2 and Element UI. |
| [yudao-ui-admin-uniapp](https://gitee.com/yudaocode/yudao-ui-admin-uniapp) | [![Gitee stars](https://gitee.com/yudaocode/yudao-ui-admin-uniapp/badge/star.svg?theme=white)](https://gitee.com/yudaocode/yudao-ui-admin-uniapp) [![GitHub stars](https://img.shields.io/github/stars/yudaocode/yudao-ui-admin-uniapp.svg?style=social&label=Stars)](https://github.com/yudaocode/yudao-ui-admin-uniapp) | Mobile administration UI; the upstream guide describes it as based on Vue2 and Element UI. |
| [yudao-ui-go-view](https://gitee.com/yudaocode/yudao-ui-go-view) | [![Gitee stars](https://gitee.com/yudaocode/yudao-ui-go-view/badge/star.svg?theme=white)](https://gitee.com/yudaocode/yudao-ui-go-view) [![GitHub stars](https://img.shields.io/github/stars/yudaocode/yudao-ui-go-view.svg?style=social&label=Stars)](https://github.com/yudaocode/yudao-ui-go-view) | Data dashboards built with Vue3 and Naive UI. |

## License and project characteristics

**What does the project offer?**

1. The project uses the [MIT License](https://gitee.com/zhijiantianya/ruoyi-vue-pro/blob/master/LICENSE) and is available for personal and commercial use. Retain the copyright and permission notice as required by the included [LICENSE](LICENSE).

2. The complete source code is open, making the project's architecture available for inspection. See the [open source project comparison](https://www.yuque.com/xiatian-bsgny/lm0ec1/wqf8mn).

![Open source project comparison](/.image/common/project-vs.png)

3. The upstream guide describes code following the Alibaba Java Development Manual, with detailed comments. It lists 113,770 lines of Java and 42,462 lines of comments as reference figures, not a fresh measurement of this repository.

## About the upstream project

The upstream author states that all upstream code is open source, with no plans for a closed commercial edition now or in the future. The author describes working at a major technology company in Shanghai during the day and contributing to open source at night.

> “I love writing code and never tire of it.”
>
> “I enjoy building open source software.”

### Upstream team's development services

The upstream team advertises contract development services and lists **Aix9975** as its WeChat contact.

The team describes its roles as project managers, architects, frontend and backend developers, testers, and operations engineers, covering the full project lifecycle.

Service areas include online stores, SCRM, office automation, logistics, ERP, human resources, finance, project management, content management, hospital systems, payments, instant messaging, WeChat Official Accounts, and mini programs.

## Built-in features

The project provides business modules to accelerate application development:

![Feature layers](/.image/common/ruoyi-vue-pro-biz.png)

* Required core modules: system management and infrastructure.
* Optional shared modules: workflows, payments, reports, and member management.
* Business modules as needed: online store, ERP for enterprise resource planning, WMS for warehouse management, CRM for customer relationships, CMS for content management, MES for manufacturing execution, HRM for human resources, FMS for finance, PMS for projects, OA for office automation, AI, IoT, instant messaging, mobile clients, and data dashboards.

> The upstream project builds on RuoYi-Vue, with a **refactored and optimized** backend and an **updated** frontend design.
>
> * 🚀 marks added features.
> * ⭐️ marks reimplemented features.

The project includes **unit tests** to support code quality and verify feature behavior.

### System management

|  | Feature | Description |
| ----- | ------- | --------------------------------- |
|  | User management | Configure accounts for system operators. |
| ⭐️ | Online users | Monitor active sessions and terminate them manually. |
|  | Role management | Assign menu permissions and organization-based data access scopes. |
|  | Menu management | Configure menus, operation permissions, and button permissions, with local caching for performance. |
|  | Department management | Organize companies, departments, and teams in a tree with data access controls. |
|  | Position management | Configure the job positions held by system users. |
| 🚀 | Tenant management | Configure tenants for multi-tenant SaaS applications. |
| 🚀 | Tenant packages | Define menu, operation, and button permissions for tenant packages. |
|  | Dictionary management | Maintain frequently used, relatively stable reference data. |
| 🚀 | SMS management | Manage channels, templates, and logs, with integrations for Alibaba Cloud, Tencent Cloud, and other providers. |
| 🚀 | Email management | Manage email accounts, templates, and delivery logs across email providers. |
| 🚀 | Internal messages | In-app notifications with message templates and message management. |
| 🚀 | Operation logs | Record and query system operations, with Swagger integration for log content. |
| ⭐️ | Login logs | Record and query login events, including failures. |
| 🚀 | Error code management | Manage error codes and edit error messages without restarting the service. |
|  | Announcements | Publish and maintain system announcements. |
| 🚀 | Sensitive words | Configure sensitive words and group them with tags. |
| 🚀 | Application management | Manage SSO applications with multiple OAuth2 authorization flows. |
| 🚀 | Region management | Display provinces, cities, and districts, with IP-to-city lookup. |

![Feature diagram](/.image/common/system-feature.png)

### Infrastructure

|  | Feature | Description |
| ----- | ----------- | ---------------------------------------------- |
| 🚀 | Code generation | Generate Java, Vue, SQL, and unit tests, with downloadable CRUD code. |
| 🚀 | API documentation | Automatically generate RESTful API documentation with Swagger. |
| 🚀 | Database documentation | Generate documentation with Screw and export Word, HTML, or Markdown. |
|  | Form builder | Generate HTML through drag-and-drop editing and export JSON or Vue files. |
| 🚀 | Configuration management | Manage dynamic system parameters with Spring Boot loading support. |
| ⭐️ | Scheduled tasks | Add, edit, and delete scheduled jobs, with execution result logs. |
| 🚀 | File storage | Store files through S3 providers including MinIO, Alibaba Cloud, Tencent Cloud, and Qiniu Cloud, or use local storage, FTP, or a database. |
| 🚀 | WebSocket | Integration examples support one-to-one and one-to-many messaging. |
| 🚀 | API logs | RESTful access and exception logs help diagnose API problems. |
|  | MySQL monitoring | Monitor the connection pool and analyze SQL to identify performance bottlenecks. |
|  | Redis monitoring | Monitor usage and manage Redis keys. |
| 🚀 | Message queues | Redis messaging uses Streams for clustered consumption and Pub/Sub for broadcast delivery. |
| 🚀 | Java monitoring | Monitor Java applications with Spring Boot Admin. |
| 🚀 | Distributed tracing | Integrate SkyWalking to trace requests across services. |
| 🚀 | Log center | Centralize logs through SkyWalking integration. |
| 🚀 | Service safeguards | Redis-based distributed locks, idempotency, and rate limiting support high-concurrency workloads. |
| 🚀 | Log service | A lightweight center for viewing remote server logs. |
| 🚀 | Unit tests | Use JUnit and Mockito to verify behavior and support code quality. |

![Feature diagram](/.image/common/infra-feature.png)

### Workflows

![Feature diagram](/.image/common/bpm-feature.png)

Workflows are built on Flowable, with support for Xinchuang databases and approval patterns commonly used in Chinese organizations:

| BPMN designer | DingTalk/Feishu-style designer |
| ------------------------------ | -------------------------------- |
| ![](/.image/工作流设计器-bpmn.jpg) | ![](/.image/工作流设计器-simple.jpg) |

> The upstream project reports production use at major enterprises and provides a simplified DingTalk/Feishu-style designer alongside a BPMN designer.
>
> The first simplifies configuration for straightforward workflows; the second supports complex orchestration.

| Feature | Description | Available |
| ------------ | ------------------------------------------------------------------------------------- | ------ |
| SIMPLE designer | Build forms and workflows by dragging and dropping in a DingTalk/Feishu-style interface; the upstream guide estimates about 10 minutes for a simple approval flow. | ✅ |
| BPMN designer | Based on BPMN for complex scenarios, multi-level approvals, and workflow automation. | ✅ |
| All-approver approval | All reviewers, such as A, B, and C, receive the task simultaneously and must approve before the next node. | ✅ |
| Any-approver approval | Any one of the assigned reviewers can complete the task to advance to the next node. | ✅ |
| Sequential approval | A, B, and C review in order, and all must approve before the next node. | ✅ |
| Carbon copy | Notify recipients of the approval result, deduplicating recipients within the same approval. | ✅ |
| Return for revision | Return the request to its initiator, the previous node, or a selected node for another review. | ✅ |
| Transfer | A transfers the task to B; after B completes it, the workflow advances to the next node. | ✅ |
| Delegation | A delegates to B; after B's review, the task returns to A for approval before advancing. | ✅ |
| Add approvers | The current reviewer can add approvers before or after their own approval step. | ✅ |
| Remove approvers | Remove added reviewers before they act on the task. | ✅ |
| Withdraw | The workflow initiator can cancel the process. | ✅ |
| Terminate | An administrator can terminate a process instance at any node. | ✅ |
| Form permissions | Drag-and-drop forms with read-only, editable, or hidden fields at each approval node. | ✅ |
| Approval timeout | Set a deadline that triggers automatic approval, rejection, or return according to configuration. | ✅ |
| Automatic reminders | Schedule SMS, email, or internal reminders with configurable repetition intervals. | ✅ |
| Subprocesses | Start child workflows from a parent, with synchronous and asynchronous modes; synchronous execution waits for the child to finish. | ✅ |
| Exclusive branches | Select one execution branch based on conditions. | ✅ |
| Parallel branches | Split the workflow into multiple branches that all execute without conditions. | ✅ |
| Inclusive branches | Execute multiple matching branches, with an optional default if none match. | ✅ |
| Routing branches | Redirect to a configured node based on conditions or continue along the default path. | ✅ |
| Trigger nodes | Trigger HTTP requests, callbacks, data updates, or deletions when the node is reached. | ✅ |
| Delay nodes | Pause execution for a fixed duration or until a specified date. | ✅ |
| Extended settings | Notifications before and after workflows and tasks, reporting, automatic approval deduplication, and custom process numbers, titles, and summaries. | ✅ |

### Payments

|  | Feature | Description |
| ----- | ------ | --------------------------- |
| 🚀 | Application settings | Configure merchant applications and connect payment channels such as Alipay and WeChat. |
| 🚀 | Payment orders | View payment orders initiated by users through integrated channels. |
| 🚀 | Refund orders | View refund orders through Alipay, WeChat, and other channels. |
| 🚀 | Callback notifications | View delivery results for payment and refund notifications to business systems. |
| 🚀 | Integration examples | Practical examples for payment and refund integration. |

### Data reports

|  | Feature | Description |
| ----- | ------- | -------------------- |
| 🚀 | Report designer | Data reports, chart reports, and print layout design. |
| 🚀 | Dashboard designer | Drag-and-drop dashboards with dozens of chart components. |

### WeChat Official Accounts

|  | Feature | Description |
| ---- | -------- | ------------------------------- |
| 🚀 | Account management | Configure and connect multiple Official Accounts. |
| 🚀 | Statistics | Track follower gains and losses, totals, message summaries, and API analytics. |
| 🚀 | Follower management | View current and former followers, synchronize them, and assign tags. |
| 🚀 | Message management | View follower messages and send replies. |
| 🚀 | Template messages | Configure notification templates and send them to followers. |
| 🚀 | Automatic replies | Reply automatically on follow events, incoming messages, or keyword matches. |
| 🚀 | Tag management | Create, query, edit, and delete account tags. |
| 🚀 | Menu management | Customize account menus or synchronize them from WeChat. |
| 🚀 | Media management | Manage images, audio, and video, with in-app audio and video playback. |
| 🚀 | Article drafts | Save text and image content as drafts and publish it to the Official Account. |
| 🚀 | Publication history | View successfully published articles and delete them. |

### Online store

Demo: <https://doc.iocoder.cn/mall-preview/>

![Feature diagram](/.image/common/mall-feature.png)

![Feature diagram](/.image/common/mall-preview.png)

### Member management

|  | Feature | Description |
| ----- | ------ | ---------------------------------- |
| 🚀 | Member management | Search and manage consumer accounts. |
| 🚀 | Member tags | Create, query, edit, and delete member tags. |
| 🚀 | Membership levels | Manage levels and growth points for benefits such as order discounts. |
| 🚀 | Member groups | Segment members for customer profiling, targeted content, and campaigns. |
| 🚀 | Points and check-ins | Award points for check-ins and purchases, redeemable against orders or rewards. |

### ERP — Enterprise resource planning

Demo: <https://doc.iocoder.cn/erp-preview/>

![Feature diagram](/.image/common/erp-feature.png)

### WMS — Warehouse management

Demo: <https://doc.iocoder.cn/wms-preview/>

![Feature diagram](/.image/common/wms-feature.png)

![Feature diagram](/.image/common/wms-preview.png)

### CRM — Customer relationship management

Demo: <https://doc.iocoder.cn/crm-preview/>

![Feature diagram](/.image/common/crm-feature.png)

### MES — Manufacturing execution

Demo: <https://doc.iocoder.cn/mes-preview/>

![Feature diagram](/.image/common/mes-feature.png)

![Feature diagram](/.image/common/mes-preview.png)

### HRM — Human resource management

Demo: <https://doc.iocoder.cn/hrm-preview/>

![Feature diagram](/.image/common/hrm-feature.png)

![Interface preview](/.image/common/hrm-preview.png)

### FMS — Financial management

Demo: <https://doc.iocoder.cn/fms-preview/>

![Feature diagram](/.image/common/fms-feature.png)

![Interface preview](/.image/common/fms-preview.png)

### PMS — Project management

Demo: <https://doc.iocoder.cn/pms-preview/>

![Feature diagram](/.image/common/pms-feature.png)

![Interface preview](/.image/common/pms-preview.png)

### OA — Office automation and collaboration

Demo: <https://doc.iocoder.cn/oa-preview/>

![Feature diagram](/.image/common/oa-feature.png)

![Interface preview](/.image/common/oa-preview.png)

### AI and large models

Demo: <https://doc.iocoder.cn/ai-preview/>

![Feature diagram](/.image/common/ai-feature.png)

![Feature diagram](/.image/common/ai-preview.gif)

### IoT — Internet of Things

Demo: <https://doc.iocoder.cn/iot/build>

![Feature diagram](/.image/common/iot-feature.png)

![Interface preview](/.image/common/iot-preview.png)

### IM — Instant messaging

Spring Boot demo: <https://doc.iocoder.cn/im-preview/>

Vue3 and Element Plus demo: <http://dashboard-vue3.yudao.iocoder.cn>


![Feature diagram](/.image/common/im-feature.png)

| Chat interface | Chat management |
| --- | --- |
| ![Chat interface](/.image/common/im-preview-home.png) | ![Chat management](/.image/common/im-preview-manager.png) |

## Technology stack

### Modules

| Module | Description |
| ----------------------- | -------------------- |
| `yudao-dependencies` | Maven dependency version management. |
| `yudao-framework` | Java framework extensions. |
| `yudao-server` | Backend server for administration and user applications. |
| `yudao-module-system` | System management features. |
| `yudao-module-infra` | Infrastructure services. |
| `yudao-module-bpm` | Workflows and business process management. |
| `yudao-module-pay` | Payments and refunds. |
| `yudao-module-report` | Reports and data dashboards. |
| `yudao-module-mp` | WeChat Official Accounts. |
| `yudao-module-mall` | Online store. |
| `yudao-module-member` | Member management. |
| `yudao-module-erp` | Enterprise resource planning. |
| `yudao-module-wms` | Warehouse management. |
| `yudao-module-crm` | Customer relationship management. |
| `yudao-module-mes` | Manufacturing execution. |
| `yudao-module-hrm` | Human resource management. |
| `yudao-module-fms` | Financial management. |
| `yudao-module-pms` | Project management. |
| `yudao-module-oa` | Office automation and collaboration. |
| `yudao-module-ai` | AI and large models. |
| `yudao-module-iot` | Internet of Things. |
| `yudao-module-im` | Instant messaging. |

### Frameworks and libraries

The versions below come from the upstream reference table. For this checkout, use [pom.xml](pom.xml) and [yudao-dependencies/pom.xml](yudao-dependencies/pom.xml) as the dependency source of truth.

| Technology | Purpose | Version | Learning guide |
| --------------------------------------------------------------------------------------------- | ------------------ | ---------------- | ---------------------------------------------------------------- |
| [Spring Boot](https://spring.io/projects/spring-boot) | Application framework | 3.5.15 | [Documentation](https://github.com/YunaiV/SpringBoot-Labs) |
| [MySQL](https://www.mysql.com/cn/) | Database server | 5.7 / 8.0+ |  |
| [Druid](https://github.com/alibaba/druid) | JDBC connection pooling and monitoring | 1.2.28 | [Documentation](http://www.iocoder.cn/Spring-Boot/datasource-pool/?yudao) |
| [MyBatis Plus](https://mp.baomidou.com/) | MyBatis extensions | 3.5.16 | [Documentation](http://www.iocoder.cn/Spring-Boot/MyBatis/?yudao) |
| [Dynamic Datasource](https://dynamic-datasource.com/) | Dynamic data sources | 4.5.0 | [Documentation](http://www.iocoder.cn/Spring-Boot/datasource-pool/?yudao) |
| [Redis](https://redis.io/) | Key-value database | 5.0 / 6.0 / 7.0 |  |
| [Redisson](https://github.com/redisson/redisson) | Redis client | 4.6.1 | [Documentation](http://www.iocoder.cn/Spring-Boot/Redis/?yudao) |
| [Spring MVC](https://github.com/spring-projects/spring-framework/tree/master/spring-webmvc) | MVC framework | 6.2.19 | [Documentation](http://www.iocoder.cn/SpringMVC/MVC/?yudao) |
| [Spring Security](https://github.com/spring-projects/spring-security) | Security and authentication framework | 6.5.11 | [Documentation](http://www.iocoder.cn/Spring-Boot/Spring-Security/?yudao) |
| [Hibernate Validator](https://github.com/hibernate/hibernate-validator) | Input validation | 8.0.3 | [Documentation](http://www.iocoder.cn/Spring-Boot/Validation/?yudao) |
| [Flowable](https://github.com/flowable/flowable-engine) | Workflow engine | 8.0.0 | [Documentation](https://doc.iocoder.cn/bpm/) |
| [Quartz](https://github.com/quartz-scheduler) | Job scheduling | 2.5.0 | [Documentation](http://www.iocoder.cn/Spring-Boot/Job/?yudao) |
| [Springdoc](https://springdoc.org/) | Swagger documentation | 2.8.17 | [Documentation](http://www.iocoder.cn/Spring-Boot/Swagger/?yudao) |
| [SkyWalking](https://skywalking.apache.org/) | Distributed application tracing | 9.6.0 | [Documentation](http://www.iocoder.cn/Spring-Boot/SkyWalking/?yudao) |
| [Spring Boot Admin](https://github.com/codecentric/spring-boot-admin) | Spring Boot monitoring | 3.5.9 | [Documentation](http://www.iocoder.cn/Spring-Boot/Admin/?yudao) |
| [Jackson](https://github.com/FasterXML/jackson) | JSON processing | 2.21.4 |  |
| [MapStruct](https://mapstruct.org/) | Java Bean mapping | 1.6.3 | [Documentation](http://www.iocoder.cn/Spring-Boot/MapStruct/?yudao) |
| [Lombok](https://projectlombok.org/) | Reduce Java boilerplate | 1.18.46 | [Documentation](http://www.iocoder.cn/Spring-Boot/Lombok/?yudao) |
| [JUnit](https://junit.org/junit5/) | Java unit testing | 5.12.2 | - |
| [Mockito](https://github.com/mockito/mockito) | Mock objects for Java tests | 5.17.0 | - |

## Screenshots

### System management

| Module | Preview 1 | Preview 2 | Preview 3 |
| ---------- | ----------------------------- | --------------------------- | --------------------------- |
| Login and home | ![Login](/.image/登录.jpg) | ![Home](/.image/首页.jpg) | ![Profile](/.image/个人中心.jpg) |
| Users and applications | ![User management](/.image/用户管理.jpg) | ![Token management](/.image/令牌管理.jpg) | ![Application management](/.image/应用管理.jpg) |
| Tenants and packages | ![Tenant management](/.image/租户管理.jpg) | ![Tenant packages](/.image/租户套餐.png) | - |
| Departments and positions | ![Department management](/.image/部门管理.jpg) | ![Position management](/.image/岗位管理.jpg) | - |
| Menus and roles | ![Menu management](/.image/菜单管理.jpg) | ![Role management](/.image/角色管理.jpg) | - |
| Audit logs | ![Operation logs](/.image/操作日志.jpg) | ![Login logs](/.image/登录日志.jpg) | - |
| SMS | ![SMS channels](/.image/短信渠道.jpg) | ![SMS templates](/.image/短信模板.jpg) | ![SMS logs](/.image/短信日志.jpg) |
| Dictionaries and sensitive words | ![Dictionary types](/.image/字典类型.jpg) | ![Dictionary data](/.image/字典数据.jpg) | ![Sensitive words](/.image/敏感词.jpg) |
| Error codes and announcements | ![Error code management](/.image/错误码管理.jpg) | ![Announcements](/.image/通知公告.jpg) | - |

### Workflows

| Module | Preview 1 | Preview 2 | Preview 3 |
| --------- | --------------------------------- | --------------------------------- | --------------------------------- |
| Workflow models | ![Model list](/.image/流程模型-列表.jpg) | ![Workflow design](/.image/流程模型-设计.jpg) | ![Workflow definitions](/.image/流程模型-定义.jpg) |
| Forms and groups | ![Workflow forms](/.image/流程表单.jpg) | ![User groups](/.image/用户分组.jpg) | - |
| My workflows | ![My workflow list](/.image/我的流程-列表.jpg) | ![Start workflow](/.image/我的流程-发起.jpg) | ![Workflow details](/.image/我的流程-详情.jpg) |
| Pending and completed tasks | ![Approvals](/.image/任务列表-审批.jpg) | ![Pending tasks](/.image/任务列表-待办.jpg) | ![Completed tasks](/.image/任务列表-已办.jpg) |
| Leave requests | ![Leave list](/.image/OA请假-列表.jpg) | ![Request leave](/.image/OA请假-发起.jpg) | ![Leave details](/.image/OA请假-详情.jpg) |

### Infrastructure

| Module | Preview 1 | Preview 2 | Preview 3 |
| --------------- | ------------------------------- | ----------------------------- | --------------------------- |
| Code generation | ![Code generator](/.image/代码生成.jpg) | ![Generated output](/.image/生成效果.jpg) | - |
| Documentation | ![API documentation](/.image/系统接口.jpg) | ![Database documentation](/.image/数据库文档.jpg) | - |
| Files and configuration | ![File storage settings](/.image/文件配置.jpg) | ![File management](/.image/文件管理2.jpg) | ![Configuration management](/.image/配置管理.jpg) |
| Scheduled tasks | ![Scheduled tasks](/.image/定时任务.jpg) | ![Task logs](/.image/任务日志.jpg) | - |
| API logs | ![Access logs](/.image/访问日志.jpg) | ![Error logs](/.image/错误日志.jpg) | - |
| MySQL & Redis | ![MySQL](/.image/MySQL.jpg) | ![Redis](/.image/Redis.jpg) | - |
| Monitoring | ![Java monitoring](/.image/Java监控.jpg) | ![Distributed tracing](/.image/链路追踪.jpg) | ![Log center](/.image/日志中心.jpg) |

### Payments

| Module | Preview 1 | Preview 2 | Preview 3 |
| --------- | --------------------------- | --------------------------------- | --------------------------------- |
| Merchants and applications | ![Merchant details](/.image/商户信息.jpg) | ![Application list](/.image/应用信息-列表.jpg) | ![Edit application](/.image/应用信息-编辑.jpg) |
| Payments and refunds | ![Payment orders](/.image/支付订单.jpg) | ![Refund orders](/.image/退款订单.jpg) | - |

### Data reports

| Module | Preview 1 | Preview 2 | Preview 3 |
| ------- | --------------------------------- | --------------------------------- | --------------------------------------- |
| Report designer | ![Data reports](/.image/报表设计器-数据报表.jpg) | ![Chart reports](/.image/报表设计器-图形报表.jpg) | ![Print design](/.image/报表设计器-打印设计.jpg) |
| Dashboard designer | ![Dashboard list](/.image/大屏设计器-列表.jpg) | ![Dashboard preview](/.image/大屏设计器-预览.jpg) | ![Dashboard editor](/.image/大屏设计器-编辑.jpg) |

### Mobile administration

| Preview 1 | Preview 2 | Preview 3 |
| ---------------------------------- | ---------------------------------- | ---------------------------------- |
| ![](/.image/admin-uniapp/01.png) | ![](/.image/admin-uniapp/02.png) | ![](/.image/admin-uniapp/03.png) |
| ![](/.image/admin-uniapp/04.png) | ![](/.image/admin-uniapp/05.png) | ![](/.image/admin-uniapp/06.png) |
| ![](/.image/admin-uniapp/07.png) | ![](/.image/admin-uniapp/08.png) | ![](/.image/admin-uniapp/09.png) |

Available features include login, profile, workspace, profile editing, avatar and password changes, frequently asked questions, and an about page.
