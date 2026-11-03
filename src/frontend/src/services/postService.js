const storage = {
  // Получить все посты для пользователя
  getPostsForUser(userId) {
    const posts = localStorage.getItem(`posts_${userId}`);
    return posts ? JSON.parse(posts) : [];
  },

  // Сохранить посты для пользователя
  savePostsForUser(userId, posts) {
    localStorage.setItem(`posts_${userId}`, JSON.stringify(posts));
  },

  // Добавить пост для пользователя
  addPostForUser(userId, post) {
    const posts = this.getPostsForUser(userId);
    const updatedPosts = [...posts, post];
    this.savePostsForUser(userId, updatedPosts);
    return updatedPosts;
  },

  // Получить посты для конкретного бизнеса
  getPostsForBusiness(userId, businessId) {
    const posts = this.getPostsForUser(userId);
    return posts.filter(post => post.businessId === businessId);
  },

  // Обновить пост
  updatePost(userId, postId, updates) {
    const posts = this.getPostsForUser(userId);
    const postIndex = posts.findIndex(p => p.id === postId);
    
    if (postIndex >= 0) {
      posts[postIndex] = { ...posts[postIndex], ...updates };
      this.savePostsForUser(userId, posts);
      return true;
    }
    return false;
  },

  // Удалить пост
  deletePost(userId, postId) {
    const posts = this.getPostsForUser(userId);
    const filteredPosts = posts.filter(p => p.id !== postId);
    this.savePostsForUser(userId, filteredPosts);
    return filteredPosts;
  },

  savePromptsForUser(userId, prompts) {
    localStorage.setItem(`prompts_${userId}`, JSON.stringify(prompts));
  },

  getPromptsForUser(userId) {
    const prompts = localStorage.getItem(`prompts_${userId}`);
    return prompts ? JSON.parse(prompts) : [];
  },

  addPromptForUser(userId, prompt) {
    const prompts = this.getPromptsForUser(userId);
    const updatedPrompts = [...prompts, prompt];
    this.savePromptsForUser(userId, updatedPrompts);
    return updatedPrompts;
  }
};

export const postService = {
  // Генерация поста (заглушка для бэкенда)
  generatePost(business, formData) {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Базовый текст заглушки
        let postTemplate = '';
        
        // Определяем стиль на основе communicationStyle бизнеса
        const communicationStyle = business.communicationStyle || 'standard';
        
        // Шаблоны в зависимости от стиля коммуникации
        const styleTemplates = {
          'formal': (platform, goal) => `
        Уважаемые клиенты ${business.name}!

        ${formData.description}

        С уважением,
        Команда ${business.name}
        ${business.industry ? `\n#${business.industry}` : ''}
          `,
          
          'friendly': (platform, goal) => `
        Привет, друзья! 👋

        ${business.name} снова на связи! 

        ${formData.description}

        Давайте общаться в комментариях! 💬

        ${platform === 'Telegram' ? '👉 Подписывайтесь на наш канал' : '👉 Вступайте в нашу группу'}
          `,
          
          'professional': (platform, goal) => `
        ${business.name} информирует:

        ${formData.description}

        ${goal === 'increase_engagement' ? 'Ждем ваши мнения в комментариях!' : 'Следите за обновлениями!'}
          `
        };

        // Выбираем шаблон по стилю бизнеса
        const template = styleTemplates[communicationStyle] || styleTemplates['standard'];
        
        // Генерируем текст
        postTemplate = template(formData.platform, formData.goal);
        
        // Добавляем тон, если указан
        if (formData.tone) {
          const tonePrefixes = {
            'formal': 'Уважаемая аудитория, ',
            'friendly': 'Дорогие друзья, ',
            'professional': 'Коллеги и партнеры, ',
            'humorous': 'Внимание, внимание! '
          };
          postTemplate = (tonePrefixes[formData.tone] || '') + postTemplate;
        }

        // Форматируем для платформы
        if (formData.platform === 'Telegram') {
          postTemplate = postTemplate + '\n\n📲 Подписывайтесь на наш Telegram-канал!';
        }

        resolve(postTemplate.trim());
      }, 1000); // Имитация задержки
    });
  },

  // Сохранить промпт (для истории генераций)
  savePrompt(userId, promptData) {
    const prompt = {
      id: `prompt_${Date.now()}`,
      userId,
      businessId: promptData.businessId,
      businessName: promptData.businessName,
      communicationStyle: promptData.communicationStyle,
      createdAt: new Date().toISOString()
    };

    return storage.addPromptForUser(userId, prompt);
  },

  // Получить историю промптов
  getPromptsForUser(userId) {
    return storage.getPromptsForUser(userId);
  },

  // Получить промпты для бизнеса
  getPromptsForBusiness(userId, businessId) {
    const prompts = this.getPromptsForUser(userId);
    return prompts.filter(prompt => prompt.businessId === businessId);
  },

  // Получить посты
  getPostsForUser(userId) {
    return storage.getPostsForUser(userId);
  },

  // Получить посты для бизнеса
  getPostsForBusiness(userId, businessId) {
    return storage.getPostsForBusiness(userId, businessId);
  },

  // Создать пост
  createPost(userId, postData) {
    const newPost = {
      id: `post_${Date.now()}`,
      userId,
      businessId: postData.businessId,
      title: postData.title || `Пост ${new Date().toLocaleDateString()}`,
      content: postData.content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return storage.addPostForUser(userId, newPost);
  },

  // Обновить пост
  updatePost(userId, postId, updates) {
    return storage.updatePost(userId, postId, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  },

  // Удалить пост
  deletePost(userId, postId) {
    return storage.deletePost(userId, postId);
  }
};