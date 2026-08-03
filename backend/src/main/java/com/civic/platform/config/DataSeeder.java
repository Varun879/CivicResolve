package com.civic.platform.config;

import com.civic.platform.domain.entities.User;
import com.civic.platform.domain.enums.Role;
import com.civic.platform.domain.repositories.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@Profile("!prod")
public class DataSeeder {

    @Bean
    CommandLineRunner initDatabase(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            if (userRepository.findByEmail("citizen@example.com").isEmpty()) {
                User citizen = new User();
                citizen.setName("Citizen Test");
                citizen.setEmail("citizen@example.com");
                citizen.setPasswordHash(passwordEncoder.encode("password"));
                citizen.setRole(Role.CITIZEN);
                citizen.setAuthProvider(com.civic.platform.domain.enums.AuthProvider.LOCAL);
                userRepository.save(citizen);
            }
            if (userRepository.findByEmail("officer@example.com").isEmpty()) {
                User officer = new User();
                officer.setName("Officer Test");
                officer.setEmail("officer@example.com");
                officer.setPasswordHash(passwordEncoder.encode("password"));
                officer.setRole(Role.FIELD_OFFICER);
                officer.setAuthProvider(com.civic.platform.domain.enums.AuthProvider.LOCAL);
                userRepository.save(officer);
            }
            if (userRepository.findByEmail("depthead@example.com").isEmpty()) {
                User depthead = new User();
                depthead.setName("DeptHead Test");
                depthead.setEmail("depthead@example.com");
                depthead.setPasswordHash(passwordEncoder.encode("password"));
                depthead.setRole(Role.DEPT_HEAD);
                depthead.setDepartment("ROAD");
                depthead.setAuthProvider(com.civic.platform.domain.enums.AuthProvider.LOCAL);
                userRepository.save(depthead);
            }
            if (userRepository.findByEmail("commissioner@example.com").isEmpty()) {
                User commissioner = new User();
                commissioner.setName("Commissioner Test");
                commissioner.setEmail("commissioner@example.com");
                commissioner.setPasswordHash(passwordEncoder.encode("password"));
                commissioner.setRole(Role.COMMISSIONER);
                commissioner.setAuthProvider(com.civic.platform.domain.enums.AuthProvider.LOCAL);
                userRepository.save(commissioner);
            }
            if (userRepository.findByEmail("varun876678@gmail.com").isEmpty()) {
                User admin = new User();
                admin.setName("Varun (Super Admin)");
                admin.setEmail("varun876678@gmail.com");
                admin.setPasswordHash(passwordEncoder.encode("Varun@9666"));
                admin.setRole(Role.SUPER_ADMIN);
                admin.setAuthProvider(com.civic.platform.domain.enums.AuthProvider.LOCAL);
                userRepository.save(admin);
            }
            userRepository.findByEmail("varunmandati7@gmail.com").ifPresentOrElse(u -> {
                u.setPasswordHash(passwordEncoder.encode("password"));
                u.setRole(Role.COMMISSIONER);
                userRepository.save(u);
            }, () -> {
                User comm2 = new User();
                comm2.setName("Commissioner Varun");
                comm2.setEmail("varunmandati7@gmail.com");
                comm2.setPasswordHash(passwordEncoder.encode("password"));
                comm2.setRole(Role.COMMISSIONER);
                comm2.setAuthProvider(com.civic.platform.domain.enums.AuthProvider.LOCAL);
                userRepository.save(comm2);
            });

            userRepository.findByEmail("237r1a05az@cmrtc.ac.in").ifPresentOrElse(u -> {
                u.setPasswordHash(passwordEncoder.encode("password"));
                u.setRole(Role.DEPT_HEAD);
                u.setDepartment("GENERAL");
                userRepository.save(u);
            }, () -> {
                User dept2 = new User();
                dept2.setName("DeptHead Varun");
                dept2.setEmail("237r1a05az@cmrtc.ac.in");
                dept2.setPasswordHash(passwordEncoder.encode("password"));
                dept2.setRole(Role.DEPT_HEAD);
                dept2.setDepartment("GENERAL");
                dept2.setAuthProvider(com.civic.platform.domain.enums.AuthProvider.LOCAL);
                userRepository.save(dept2);
            });

            userRepository.findByEmail("varun765567@gmail.com").ifPresentOrElse(u -> {
                u.setPasswordHash(passwordEncoder.encode("password"));
                u.setRole(Role.FIELD_OFFICER);
                u.setDepartment("GENERAL");
                userRepository.save(u);
            }, () -> {
                User off2 = new User();
                off2.setName("Officer Varun");
                off2.setEmail("varun765567@gmail.com");
                off2.setPasswordHash(passwordEncoder.encode("password"));
                off2.setRole(Role.FIELD_OFFICER);
                off2.setDepartment("GENERAL");
                off2.setAuthProvider(com.civic.platform.domain.enums.AuthProvider.LOCAL);
                userRepository.save(off2);
            });
        };
    }
}
