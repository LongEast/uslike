workspace {
    !identifiers flat
    !impliedRelationships false

    model {
        user = element "用户" "person" "" "Internal,PersonShape"

        client = element "安卓/苹果客户端/网页" "container" \
            "用户交互页面：包括注册、登录、好友、消息、语音/打字聊天、动态、设置" \
            "Internal,ClientShape"

        realtimeGateway = element "实时网关" "software container" "" "Internal"

        userStatusRedis = element "用户状态redis" "container" \
            "用户是否在线，房间状态" \
            "Internal,Database"

        paymentSystem = element "付款系统" "software system" "" "External"

        mallProductDatabase = element "商城产品数据库" "container" "" "Internal,Database"

        mall = element "商城" "software container" \
            "售卖个性装饰，月卡等" \
            "Internal"

        authService = element "身份认证服务" "software container" \
            "用户验证信息，鉴定登录密码并进行注册/登录" \
            "External"

    gameService = element "游戏服务" "software container" \
            "提供游戏服务" \
            "Internal"

feishu = element "飞书AI" "software container" \
            "" \
            "External"

	chatService = element "聊天服务" "software container" \
            "用户聊天功能" \
            "External"

        authUserProfileService = element "用户档案服务" "software container" \
            "修改资料，兴趣标签" \
            "Internal"

        apiGateway = element "API网关" "software container" \
            "rate limiting，用户权限，routing" \
            "Internal"

        assistant = element "智能小助手" "software container" \
            "可接收用户问题并调用大语言模型" \
            "Internal"

        feedService = element "动态流服务" "software container" \
            "发动态、点赞、评论、与附件、举报" \
            "Internal"

        postDatabase = element "帖子数据库" "container" "" "Internal,Database"

        postRedis = element "帖子redis" "container" "" "Internal,Database"

        matchingService = element "匹配服务" "software container" \
            "候选召回，取候选池，打分，匹配" \
            "Internal"

        userDatabase = element "账户数据库" "container" "" "Internal,Database"

        messageQueue = element "消息队列" "software container" \
            "新的用户" \
            "Internal"

        embeddingIngestionService = element "Embedding生成服务" "software container" \
            "变更用户信息，生成embedding对象" \
            "External"

        embeddingDatabase = element "Embedding数据库" "container" \
            "embedding后的结构，内容：userEmbedding、post/newsEmbedding" \
            "Internal,Database"

        roomChatService = element "房间服务" "software container" \
            "创建房间，房间内操作" \
            "Internal"

        chatRedis = element "redis缓存" "container" \
		""\
            "Internal,Database"

        realtimeCommunicationSystem = element "实时通信系统" "software system" "支持实时音视频" "External"

        chatRecordDatabase = element "聊天记录数据库" "container" "" "Internal,Database"

        
        friendService = element "好友服务" "container" \
	"好友列表，好友添加" \
            "Internal"
        
        friendDatabase = element "好友列表数据库" "container" "" "Internal,Database"
        
        

        user -> client

        client -> apiGateway "HTTPS"
        client -> realtimeGateway "Websocket"

        realtimeGateway -> userStatusRedis
        realtimeGateway -> matchingService
	realtimeGateway -> chatService
	chatService -> roomChatService

        userStatusRedis -> matchingService

        apiGateway -> mall
        mall -> paymentSystem
        mall -> mallProductDatabase

        apiGateway -> authService
        authService -> userDatabase

        apiGateway -> authUserProfileService
        authUserProfileService -> userDatabase "写入"
        authUserProfileService -> messageQueue

        messageQueue -> embeddingIngestionService
feishu -> embeddingIngestionService
        embeddingIngestionService -> embeddingDatabase

        apiGateway -> feedService
        feedService -> postDatabase
        feedService -> postRedis
        feedService -> embeddingDatabase

        apiGateway -> matchingService
        matchingService -> embeddingDatabase "召回"
        matchingService -> roomChatService "创建"

        apiGateway -> assistant
        assistant -> feishu

        chatService -> chatRedis
        roomChatService -> realtimeCommunicationSystem
        chatService -> chatRecordDatabase
        
        apiGateway -> friendService
        friendService -> friendDatabase
        friendService -> chatService
        
        friendService -> roomChatService

	roomChatService -> gameService
	friendService -> gameService

    }

    views {
        custom "Architecture" {
            include *
            autoLayout lr 250 160
        }

        styles {
            element "Element" {
                shape Box
                width 420
                height 280
                background #2185d0
                color #ffffff
                stroke #4b5563
                strokeWidth 2
                fontSize 22
                metadata true
                description true
            }

            element "Internal" {
                background #2185d0
                color #ffffff
            }

            element "External" {
                background #8f969d
                color #ffffff
            }

            element "Database" {
                shape Cylinder
            }

            element "PersonShape" {
                shape Person
                background #123da8
                color #ffffff
            }

            element "ClientShape" {
                shape WebBrowser
                background #2185d0
                color #ffffff
            }

            relationship "Relationship" {
                color #252525
                thickness 2
                style solid
                routing Direct
                fontSize 18
            }
        }
    }
}