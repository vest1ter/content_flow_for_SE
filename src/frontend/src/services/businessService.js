export const businessService = {
  // Получаем следующий ID для бизнеса
  getNextBusinessId() {
    // Получаем всех пользователей из localStorage
    const users = JSON.parse(localStorage.getItem('registered_users') || '[]');
    let maxId = -1;
    
    users.forEach(user => {
      const businesses = this.getBusinessesForUser(user.id);
      businesses.forEach(business => {
        const match = business.id.match(/business_(\d+)/);
        if (match) {
          const idNum = parseInt(match[1], 10);
          if (idNum > maxId) {
            maxId = idNum;
          }
        }
      });
    });
    
    return `business_${maxId + 1}`;
  },
  
  // Переиндексация бизнесов для сохранения последовательности ID
  reindexBusinesses(userId) {
    const businesses = this.getBusinessesForUser(userId);
    const reindexed = businesses.map((business, index) => ({
      ...business,
      id: `business_${index}`
    }));
    this.saveBusinessesForUser(userId, reindexed);
    return reindexed;
  },
  
  // Удаление бизнеса с автоматической переиндексацией
  deleteBusiness(userId, businessId) {
    const businesses = this.getBusinessesForUser(userId);
    const filtered = businesses.filter(b => b.id !== businessId);
    
    // Переиндексируем оставшиеся бизнесы
    const reindexed = filtered.map((business, index) => ({
      ...business,
      id: `business_${index}`
    }));
    
    this.saveBusinessesForUser(userId, reindexed);
    return reindexed;
  },
  
  // Обновление бизнеса - ДОБАВЛЯЕМ ЭТОТ МЕТОД
  updateBusiness(userId, businessId, updates) {
    const businesses = this.getBusinessesForUser(userId);
    const updatedBusinesses = businesses.map(business => 
      business.id === businessId 
        ? { 
            ...business, 
            ...updates, 
            updatedAt: new Date().toISOString() 
          }
        : business
    );
    this.saveBusinessesForUser(userId, updatedBusinesses);
    return updatedBusinesses;
  },
  
  // Сохранение бизнесов привязанных к пользователю
  saveBusinessesForUser(userId, businesses) {
    localStorage.setItem(`businesses_${userId}`, JSON.stringify(businesses));
  },

  getBusinessesForUser(userId) {
    const businesses = localStorage.getItem(`businesses_${userId}`);
    return businesses ? JSON.parse(businesses) : [];
  },

  addBusinessForUser(userId, business) {
    const existingBusinesses = this.getBusinessesForUser(userId);
    const updatedBusinesses = [...existingBusinesses, business];
    this.saveBusinessesForUser(userId, updatedBusinesses);
    return updatedBusinesses;
  },
};