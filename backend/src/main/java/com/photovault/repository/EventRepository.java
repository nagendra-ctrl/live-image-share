package com.photovault.repository;

import com.photovault.entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EventRepository extends JpaRepository<Event, Long> {

    Optional<Event> findByAccessCode(String accessCode);

    boolean existsByAccessCode(String accessCode);

    List<Event> findAllByOrderByCreatedAtDesc();
}
