package com.civic.platform.domain.repositories;

import com.civic.platform.domain.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    Optional<User> findByPhone(String phone);
    java.util.List<User> findByRoleAndDepartment(com.civic.platform.domain.enums.Role role, String department);
    long countByPointsGreaterThan(int points);
    long countByRole(com.civic.platform.domain.enums.Role role);
    java.util.List<User> findTop10ByRoleOrderByPointsDesc(com.civic.platform.domain.enums.Role role);
    java.util.List<User> findByRole(com.civic.platform.domain.enums.Role role);
}
